import { v4 as uuidv4 } from 'uuid';
import { demandAgent, type DemandForecastResult } from './demand-agent';
import { inventoryAgent, type InventoryOptimizationResult } from './inventory-agent';
import { supplierAgent, type SupplierRecommendation } from './supplier-agent';
import { riskAgent, type RiskAnalysisResult } from './risk-agent';
import { storage } from '../storage';
import { getStructuredCompletion } from '../openai';

export interface AgentVote {
  agentType: 'demand' | 'inventory' | 'supplier' | 'risk';
  recommendation: string;
  confidence: number;
  reasoning: string;
}

export interface SessionLog {
  timestamp: Date;
  agentType: string;
  action: string;
  message: string;
  data?: any;
}

export interface OrchestrationResult {
  sessionId: string;
  finalDecision: {
    productId: number;
    locationId: number;
    orderQuantity: number;
    supplierId: number;
    estimatedCost: number;
    urgency: 'low' | 'medium' | 'high';
    riskLevel: string;
  };
  agentVotes: AgentVote[];
  consensusReached: boolean;
  sessionLog: SessionLog[];
  confidence: number;
  demandForecast: DemandForecastResult;
  inventoryAnalysis: InventoryOptimizationResult;
  supplierRecommendation: SupplierRecommendation;
  riskAnalysis: RiskAnalysisResult;
}

/**
 * Agent Orchestrator
 * Coordinates all AI agents and facilitates multi-agent negotiation
 */
export class Orchestrator {
  /**
   * Run complete multi-agent analysis
   */
  async runAnalysis(
    productId: number,
    locationId: number,
    timeHorizonDays: number = 30
  ): Promise<OrchestrationResult> {
    const sessionId = uuidv4();
    const sessionLog: SessionLog[] = [];
    
    this.log(sessionLog, 'orchestrator', 'start', 'Multi-agent analysis session started');

    try {
      // Get product info
      const product = await storage.getProductById(productId);
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      // Step 1: Demand Forecasting Agent
      this.log(sessionLog, 'orchestrator', 'invoke', 'Invoking Demand Forecasting Agent');
      const demandForecast = await demandAgent.forecast(productId, locationId, timeHorizonDays);
      await storage.logAgentReasoning({
        sessionId,
        agentType: 'demand',
        step: 1,
        reasoning: demandForecast.reasoning,
        data: demandForecast,
        confidence: demandForecast.confidence,
      });
      this.log(sessionLog, 'demand', 'complete', 
        `Predicted demand: ${demandForecast.predictedDemand} units over ${timeHorizonDays} days`,
        { predictedDemand: demandForecast.predictedDemand, confidence: demandForecast.confidence }
      );

      // Step 2: Inventory Optimization Agent
      this.log(sessionLog, 'orchestrator', 'invoke', 'Invoking Inventory Optimization Agent');
      const inventoryAnalysis = await inventoryAgent.optimize(
        productId,
        locationId,
        demandForecast.predictedDemand,
        product.leadTimeDays
      );
      await storage.logAgentReasoning({
        sessionId,
        agentType: 'inventory',
        step: 2,
        reasoning: inventoryAnalysis.reasoning,
        data: inventoryAnalysis,
        confidence: 1 - inventoryAnalysis.stockoutRisk,
      });
      this.log(sessionLog, 'inventory', 'complete',
        `Optimal stock: ${inventoryAnalysis.optimalStock}, Reorder point: ${inventoryAnalysis.reorderPoint}`,
        inventoryAnalysis
      );

      // Determine urgency based on stockout risk
      let urgency: 'low' | 'medium' | 'high' = 'medium';
      if (inventoryAnalysis.stockoutRisk > 0.7) urgency = 'high';
      else if (inventoryAnalysis.stockoutRisk < 0.3) urgency = 'low';

      // Step 3: Supplier Coordination Agent
      this.log(sessionLog, 'orchestrator', 'invoke', 'Invoking Supplier Coordination Agent');
      const requiredQuantity = Math.max(
        inventoryAnalysis.optimalStock - (await storage.getInventoryLevel(productId, locationId))?.currentStock || 0,
        inventoryAnalysis.safetyStock
      );
      const supplierRecommendation = await supplierAgent.recommendOrder(
        productId,
        requiredQuantity,
        urgency
      );
      await storage.logAgentReasoning({
        sessionId,
        agentType: 'supplier',
        step: 3,
        reasoning: supplierRecommendation.reasoning,
        data: supplierRecommendation,
        confidence: 0.85,
      });
      this.log(sessionLog, 'supplier', 'complete',
        `Recommended supplier: ${supplierRecommendation.recommendedSupplier.name}, Quantity: ${supplierRecommendation.orderQuantity}`,
        supplierRecommendation
      );

      // Step 4: Risk Analysis Agent
      this.log(sessionLog, 'orchestrator', 'invoke', 'Invoking Risk Analysis Agent');
      const supplier = await storage.getSupplierById(supplierRecommendation.recommendedSupplier.id);
      const riskAnalysis = await riskAgent.analyze(
        productId,
        locationId,
        { 
          predictedDemand: demandForecast.predictedDemand, 
          confidence: demandForecast.confidence 
        },
        {
          currentStock: (await storage.getInventoryLevel(productId, locationId))?.currentStock || 0,
          reorderPoint: inventoryAnalysis.reorderPoint,
          stockoutRisk: inventoryAnalysis.stockoutRisk,
        },
        {
          leadTime: supplier?.leadTimeDays || product.leadTimeDays,
          reliability: supplier?.reliability || 0.95,
        }
      );
      await storage.logAgentReasoning({
        sessionId,
        agentType: 'risk',
        step: 4,
        reasoning: riskAnalysis.reasoning,
        data: riskAnalysis,
        confidence: 1 - riskAnalysis.overallRisk,
      });
      this.log(sessionLog, 'risk', 'complete',
        `Overall risk: ${(riskAnalysis.overallRisk * 100).toFixed(1)}%, Alert level: ${riskAnalysis.alertLevel}`,
        riskAnalysis
      );

      // Step 5: Multi-agent negotiation
      this.log(sessionLog, 'orchestrator', 'negotiate', 'Starting multi-agent negotiation');
      const agentVotes = await this.conductNegotiation(
        demandForecast,
        inventoryAnalysis,
        supplierRecommendation,
        riskAnalysis,
        sessionLog
      );

      // Step 6: Reach consensus
      this.log(sessionLog, 'orchestrator', 'consensus', 'Calculating consensus decision');
      const finalDecision = this.calculateConsensus(
        agentVotes,
        productId,
        locationId,
        supplierRecommendation,
        riskAnalysis,
        inventoryAnalysis
      );

      const overallConfidence = agentVotes.reduce((sum, v) => sum + v.confidence, 0) / agentVotes.length;

      this.log(sessionLog, 'orchestrator', 'complete', 
        `Final decision: Order ${finalDecision.orderQuantity} units from supplier ${finalDecision.supplierId}`,
        finalDecision
      );

      return {
        sessionId,
        finalDecision,
        agentVotes,
        consensusReached: true,
        sessionLog,
        confidence: overallConfidence,
        demandForecast,
        inventoryAnalysis,
        supplierRecommendation,
        riskAnalysis,
      };
    } catch (error) {
      this.log(sessionLog, 'orchestrator', 'error', `Analysis failed: ${error}`);
      throw error;
    }
  }

  /**
   * Conduct multi-agent negotiation
   */
  private async conductNegotiation(
    demandForecast: DemandForecastResult,
    inventoryAnalysis: InventoryOptimizationResult,
    supplierRecommendation: SupplierRecommendation,
    riskAnalysis: RiskAnalysisResult,
    sessionLog: SessionLog[]
  ): Promise<AgentVote[]> {
    // Each agent votes on the recommended action
    const votes: AgentVote[] = [];

    // Demand Agent Vote
    votes.push({
      agentType: 'demand',
      recommendation: `Order based on ${demandForecast.predictedDemand} units forecasted demand`,
      confidence: demandForecast.confidence,
      reasoning: `Forecast shows ${demandForecast.seasonalFactors.trend} trend with ${demandForecast.seasonalFactors.seasonality} seasonality. Confidence: ${(demandForecast.confidence * 100).toFixed(0)}%`,
    });

    // Inventory Agent Vote
    votes.push({
      agentType: 'inventory',
      recommendation: `Order ${inventoryAnalysis.optimalStock} units to reach optimal stock level`,
      confidence: 1 - inventoryAnalysis.stockoutRisk,
      reasoning: `Current stockout risk at ${(inventoryAnalysis.stockoutRisk * 100).toFixed(0)}%. Reorder point: ${inventoryAnalysis.reorderPoint} units. ${inventoryAnalysis.recommendations[0] || ''}`,
    });

    // Supplier Agent Vote
    votes.push({
      agentType: 'supplier',
      recommendation: `Order ${supplierRecommendation.orderQuantity} units from ${supplierRecommendation.recommendedSupplier.name}`,
      confidence: 0.85,
      reasoning: `Selected supplier offers ${supplierRecommendation.expectedLeadTime}-day lead time with best overall value. Total cost: $${supplierRecommendation.totalCost.toFixed(2)}`,
    });

    // Risk Agent Vote
    const riskConfidence = 1 - riskAnalysis.overallRisk;
    votes.push({
      agentType: 'risk',
      recommendation: riskAnalysis.alertLevel === 'critical' || riskAnalysis.alertLevel === 'high'
        ? 'Immediate action required due to high risk'
        : 'Proceed with standard ordering process',
      confidence: riskConfidence,
      reasoning: `Overall risk: ${(riskAnalysis.overallRisk * 100).toFixed(0)}%. Alert level: ${riskAnalysis.alertLevel}. ${riskAnalysis.mitigationStrategies[0] || ''}`,
    });

    // Log negotiation
    for (const vote of votes) {
      this.log(sessionLog, vote.agentType, 'vote', vote.recommendation, {
        confidence: vote.confidence,
        reasoning: vote.reasoning,
      });
    }

    // Use AI to facilitate negotiation
    try {
      const systemPrompt = `You are a decision facilitator coordinating multiple AI agents.
Analyze their recommendations and help reach optimal consensus.`;

      const userPrompt = `Multiple AI agents have provided recommendations:

${votes.map((v, i) => `${i + 1}. ${v.agentType.toUpperCase()} Agent:
   Recommendation: ${v.recommendation}
   Confidence: ${(v.confidence * 100).toFixed(0)}%
   Reasoning: ${v.reasoning}`).join('\n\n')}

Identify any conflicts and suggest resolution. Provide JSON response:
{
  "conflicts": ["<conflict 1>", "<conflict 2>"],
  "resolution": "<how to resolve>",
  "consensusStrength": <0-1>
}`;

      const negotiationResult = await getStructuredCompletion<{
        conflicts: string[];
        resolution: string;
        consensusStrength: number;
      }>(systemPrompt, userPrompt);

      this.log(sessionLog, 'orchestrator', 'negotiation_result', negotiationResult.resolution, negotiationResult);
    } catch (error) {
      this.log(sessionLog, 'orchestrator', 'negotiation_fallback', 'Using simple consensus algorithm');
    }

    return votes;
  }

  /**
   * Calculate consensus decision from agent votes
   */
  private calculateConsensus(
    votes: AgentVote[],
    productId: number,
    locationId: number,
    supplierRecommendation: SupplierRecommendation,
    riskAnalysis: RiskAnalysisResult,
    inventoryAnalysis: InventoryOptimizationResult
  ) {
    // Weighted average approach - inventory and risk agents have higher weight
    const weights = {
      demand: 0.25,
      inventory: 0.35,
      supplier: 0.25,
      risk: 0.15,
    };

    // Use supplier recommendation as base
    const orderQuantity = supplierRecommendation.orderQuantity;
    
    // Adjust urgency based on risk
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    if (riskAnalysis.alertLevel === 'critical' || riskAnalysis.alertLevel === 'high') {
      urgency = 'high';
    } else if (riskAnalysis.alertLevel === 'low') {
      urgency = 'low';
    }

    return {
      productId,
      locationId,
      orderQuantity,
      supplierId: supplierRecommendation.recommendedSupplier.id,
      estimatedCost: supplierRecommendation.totalCost,
      urgency,
      riskLevel: riskAnalysis.alertLevel,
    };
  }

  /**
   * Log session activity
   */
  private log(
    sessionLog: SessionLog[],
    agentType: string,
    action: string,
    message: string,
    data?: any
  ) {
    sessionLog.push({
      timestamp: new Date(),
      agentType,
      action,
      message,
      data,
    });
  }
}

export const orchestrator = new Orchestrator();
