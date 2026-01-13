import express, { type Request, type Response } from 'express';
import { storage, initializeDatabase, seedDatabase } from './storage';
import { orchestrator } from './agents/orchestrator';
import { demandAgent } from './agents/demand-agent';
import { inventoryAgent } from './agents/inventory-agent';
import { supplierAgent } from './agents/supplier-agent';
import { riskAgent } from './agents/risk-agent';
import { purchaseOrderGenerator } from './actions/purchase-order';
import { inventoryUpdater } from './actions/inventory-updater';
import { notificationDispatcher } from './actions/notification-dispatcher';
import { accuracyTracker } from './learning/accuracy-tracker';
import { modelEvaluator } from './learning/model-evaluator';
import { feedbackProcessor } from './learning/feedback-processor';
import { wsManager } from './websocket';

const router = express.Router();

/**
 * Health Check
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    websocketClients: wsManager.getClientCount()
  });
});

/**
 * Initialize/Seed Database
 */
router.post('/admin/init-db', async (_req: Request, res: Response) => {
  try {
    await initializeDatabase();
    await seedDatabase();
    res.json({ success: true, message: 'Database initialized and seeded' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Products
 */
router.get('/products', async (_req: Request, res: Response) => {
  try {
    const products = await storage.getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await storage.getProductById(parseInt(req.params.id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Locations
 */
router.get('/locations', async (_req: Request, res: Response) => {
  try {
    const locations = await storage.getLocations();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Suppliers
 */
router.get('/suppliers', async (_req: Request, res: Response) => {
  try {
    const suppliers = await storage.getSuppliers();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Inventory Levels
 */
router.get('/inventory/:productId/:locationId', async (req: Request, res: Response) => {
  try {
    const inventory = await storage.getInventoryLevel(
      parseInt(req.params.productId),
      parseInt(req.params.locationId)
    );
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' });
    }
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/inventory/status', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
    const status = await inventoryUpdater.getInventoryStatus(locationId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/inventory/update', async (req: Request, res: Response) => {
  try {
    const result = await inventoryUpdater.updateInventory(req.body);
    
    if (result.alertTriggered) {
      wsManager.sendAlert('warning', result.alertMessage || 'Inventory alert');
    }
    
    wsManager.sendInventoryUpdate(
      req.body.productId,
      req.body.locationId,
      result.newStock,
      result.previousStock
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * AI Analysis - Run Multi-Agent System
 */
router.post('/analysis/run', async (req: Request, res: Response) => {
  try {
    const { productId, locationId, timeHorizonDays } = req.body;
    
    if (!productId || !locationId) {
      return res.status(400).json({ error: 'productId and locationId are required' });
    }

    // Notify clients that analysis is starting
    wsManager.sendAgentUpdate('orchestrator', 'start', { productId, locationId });
    
    const result = await orchestrator.runAnalysis(
      parseInt(productId),
      parseInt(locationId),
      timeHorizonDays || 30
    );
    
    // Send updates for each agent
    wsManager.sendAgentUpdate('demand', 'complete', result.demandForecast);
    wsManager.sendAgentUpdate('inventory', 'complete', result.inventoryAnalysis);
    wsManager.sendAgentUpdate('supplier', 'complete', result.supplierRecommendation);
    wsManager.sendAgentUpdate('risk', 'complete', result.riskAnalysis);
    wsManager.sendAgentUpdate('orchestrator', 'complete', result.finalDecision);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Decisions
 */
router.get('/decisions', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const decisions = await storage.getDecisions(limit);
    res.json(decisions);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/decisions', async (req: Request, res: Response) => {
  try {
    const decision = await storage.createDecision(req.body);
    wsManager.sendDecisionUpdate(decision.id, 'created', decision);
    res.json(decision);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/decisions/:id/approve', async (req: Request, res: Response) => {
  try {
    const { approvedBy } = req.body;
    await storage.approveDecision(parseInt(req.params.id), approvedBy);
    wsManager.sendDecisionUpdate(parseInt(req.params.id), 'approved', { approvedBy });
    res.json({ success: true, message: 'Decision approved' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Purchase Orders
 */
router.get('/purchase-orders', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const orders = await storage.getPurchaseOrders(limit);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/purchase-orders', async (req: Request, res: Response) => {
  try {
    const result = await purchaseOrderGenerator.generatePurchaseOrder(req.body);
    wsManager.sendAlert('info', `Purchase order ${result.purchaseOrder.poNumber} created`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/purchase-orders/:id/approve', async (req: Request, res: Response) => {
  try {
    const { approvedBy, sendEmail } = req.body;
    const result = await purchaseOrderGenerator.approvePurchaseOrder(
      parseInt(req.params.id),
      approvedBy,
      sendEmail !== false
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/purchase-orders/:id/receive', async (req: Request, res: Response) => {
  try {
    const { actualQuantity } = req.body;
    const result = await purchaseOrderGenerator.markAsReceived(
      parseInt(req.params.id),
      actualQuantity
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/purchase-orders/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await purchaseOrderGenerator.getPurchaseOrderStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Agent Reasoning Logs
 */
router.get('/agent-logs/:sessionId', async (req: Request, res: Response) => {
  try {
    const logs = await storage.getAgentReasoningLogs(req.params.sessionId);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Notifications
 */
router.post('/notifications/send', async (req: Request, res: Response) => {
  try {
    const result = await notificationDispatcher.dispatch(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/notifications/stockout-alert', async (req: Request, res: Response) => {
  try {
    const { productName, locationName, currentStock, recipients } = req.body;
    await notificationDispatcher.sendStockoutAlert(
      productName,
      locationName,
      currentStock,
      recipients
    );
    res.json({ success: true, message: 'Stockout alerts sent' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Learning & Analytics
 */
router.get('/analytics/accuracy', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const metrics = await accuracyTracker.calculatePeriodAccuracy(days);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/analytics/accuracy/by-category', async (_req: Request, res: Response) => {
  try {
    const breakdown = await accuracyTracker.getAccuracyByCategory();
    res.json(breakdown);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/analytics/accuracy/report', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const report = await accuracyTracker.generateAccuracyReport(days);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const result = await feedbackProcessor.collectFeedback(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/feedback/process', async (_req: Request, res: Response) => {
  try {
    const result = await feedbackProcessor.processFeedback();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/feedback/report', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const report = await feedbackProcessor.generateFeedbackReport(days);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Model Configs
 */
router.get('/models/active', async (_req: Request, res: Response) => {
  try {
    const config = await storage.getActiveModelConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Sales History
 */
router.get('/sales-history/:productId/:locationId', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 90;
    const history = await storage.getSalesHistory(
      parseInt(req.params.productId),
      parseInt(req.params.locationId),
      days
    );
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Events
 */
router.get('/events/upcoming', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const events = await storage.getUpcomingEvents(days);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
