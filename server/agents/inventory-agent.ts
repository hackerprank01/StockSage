import { getStructuredCompletion } from '../openai';
import { storage } from '../storage';

export interface InventoryOptimizationResult {
  optimalStock: number;
  reorderPoint: number;
  safetyStock: number;
  stockoutRisk: number;
  reasoning: string;
  recommendations: string[];
}

/**
 * Inventory Optimization Agent
 * Monitors stock levels and calculates optimal inventory parameters
 */
export class InventoryAgent {
  /**
   * Analyze inventory and provide optimization recommendations
   */
  async optimize(
    productId: number,
    locationId: number,
    predictedDemand: number,
    leadTimeDays: number
  ): Promise<InventoryOptimizationResult> {
    // Get current inventory level
    const inventoryLevel = await storage.getInventoryLevel(productId, locationId);
    const product = await storage.getProductById(productId);
    
    if (!inventoryLevel) {
      return {
        optimalStock: 0,
        reorderPoint: 0,
        safetyStock: 0,
        stockoutRisk: 1.0,
        reasoning: 'No inventory data found for this product-location combination.',
        recommendations: ['Initialize inventory tracking for this location'],
      };
    }

    // Calculate daily demand rate
    const dailyDemand = predictedDemand / 30; // Assuming 30-day forecast
    
    // Calculate lead time demand
    const leadTimeDemand = dailyDemand * leadTimeDays;
    
    // Calculate basic safety stock (using simple multiplier)
    const demandVariability = dailyDemand * 0.3; // Assume 30% variability
    const serviceLevel = 0.95; // 95% service level
    const zScore = 1.65; // Z-score for 95% service level
    const basicSafetyStock = Math.ceil(zScore * demandVariability * Math.sqrt(leadTimeDays));
    
    // Calculate stockout risk
    const daysUntilStockout = inventoryLevel.currentStock / dailyDemand;
    let stockoutRisk = 0;
    if (daysUntilStockout <= leadTimeDays) {
      stockoutRisk = 1.0 - (daysUntilStockout / leadTimeDays);
    } else if (daysUntilStockout <= leadTimeDays * 2) {
      stockoutRisk = 0.3;
    } else {
      stockoutRisk = 0.1;
    }
    stockoutRisk = Math.max(0, Math.min(1, stockoutRisk));

    // Prepare data for AI analysis
    const systemPrompt = `You are an inventory optimization expert specializing in preventing stockouts while minimizing holding costs.
Analyze inventory levels and demand patterns to recommend optimal stock parameters.
Use Economic Order Quantity (EOQ) principles and consider lead times, demand variability, and service levels.`;

    const userPrompt = `Optimize inventory parameters for the following situation:

Product: ${product.name} (${product.sku})
Current Stock: ${inventoryLevel.currentStock} units
Current Reorder Point: ${inventoryLevel.reorderPoint} units
Current Optimal Stock: ${inventoryLevel.optimalStock} units

Demand Analysis:
- Predicted Monthly Demand: ${predictedDemand} units
- Daily Demand Rate: ${dailyDemand.toFixed(2)} units/day
- Lead Time: ${leadTimeDays} days
- Lead Time Demand: ${leadTimeDemand.toFixed(2)} units

Current Situation:
- Days Until Stockout (at current rate): ${daysUntilStockout.toFixed(1)} days
- Stockout Risk: ${(stockoutRisk * 100).toFixed(1)}%
- Calculated Safety Stock (95% service level): ${basicSafetyStock} units

Cost Information:
- Unit Cost: $${product.unitCost}
- Selling Price: $${product.sellingPrice}
- Holding Cost/Unit: ~$${(product.unitCost * 0.25).toFixed(2)} annually

Provide a JSON response with:
{
  "optimalStock": <recommended optimal stock level>,
  "reorderPoint": <when to reorder>,
  "safetyStock": <buffer stock for variability>,
  "stockoutRisk": <0-1 risk score>,
  "reasoning": "<detailed explanation>",
  "recommendations": ["<actionable recommendation 1>", "<recommendation 2>", ...]
}`;

    try {
      const result = await getStructuredCompletion<InventoryOptimizationResult>(
        systemPrompt,
        userPrompt
      );

      // Validate results
      result.optimalStock = Math.max(0, Math.round(result.optimalStock));
      result.reorderPoint = Math.max(0, Math.round(result.reorderPoint));
      result.safetyStock = Math.max(0, Math.round(result.safetyStock));
      result.stockoutRisk = Math.max(0, Math.min(1, result.stockoutRisk));

      return result;
    } catch (error) {
      console.error('Inventory optimization error:', error);
      
      // Fallback calculation
      const fallbackOptimalStock = Math.ceil(leadTimeDemand * 2 + basicSafetyStock);
      const fallbackReorderPoint = Math.ceil(leadTimeDemand + basicSafetyStock);
      
      return {
        optimalStock: fallbackOptimalStock,
        reorderPoint: fallbackReorderPoint,
        safetyStock: basicSafetyStock,
        stockoutRisk,
        reasoning: `Fallback calculation: Optimal stock set to 2x lead time demand plus safety stock. Reorder point at lead time demand plus safety stock. Current stockout risk: ${(stockoutRisk * 100).toFixed(1)}%.`,
        recommendations: [
          stockoutRisk > 0.5 ? 'URGENT: Place order immediately to prevent stockout' : 'Monitor inventory levels closely',
          `Maintain safety stock of ${basicSafetyStock} units`,
          `Reorder when stock falls below ${fallbackReorderPoint} units`,
        ],
      };
    }
  }

  /**
   * Calculate Economic Order Quantity (EOQ)
   */
  calculateEOQ(
    annualDemand: number,
    orderCost: number,
    holdingCostPerUnit: number
  ): number {
    if (holdingCostPerUnit <= 0) return 0;
    return Math.ceil(Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit));
  }

  /**
   * Check if reorder is needed
   */
  async needsReorder(productId: number, locationId: number): Promise<boolean> {
    const inventoryLevel = await storage.getInventoryLevel(productId, locationId);
    if (!inventoryLevel) return false;
    
    return inventoryLevel.currentStock <= inventoryLevel.reorderPoint;
  }

  /**
   * Get all products that need reordering at a location
   */
  async getReorderList(locationId: number): Promise<number[]> {
    const products = await storage.getProducts();
    const reorderList: number[] = [];
    
    for (const product of products) {
      const needs = await this.needsReorder(product.id, locationId);
      if (needs) {
        reorderList.push(product.id);
      }
    }
    
    return reorderList;
  }
}

export const inventoryAgent = new InventoryAgent();
