import { getStructuredCompletion } from '../openai';
import { storage } from '../storage';

export interface RiskFactor {
  type: 'stockout' | 'cost' | 'supplier' | 'demand_volatility';
  severity: number; // 0-1
  description: string;
}

export interface RiskAnalysisResult {
  overallRisk: number; // 0-1
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  reasoning: string;
  alertLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Risk Analysis Agent
 * Identifies and quantifies various inventory risks
 */
export class RiskAgent {
  // Risk weights for overall score calculation
  private readonly weights = {
    stockout: 0.4,
    cost: 0.2,
    supplier: 0.25,
    demand_volatility: 0.15,
  };

  /**
   * Perform comprehensive risk analysis
   */
  async analyze(
    productId: number,
    locationId: number,
    demandForecast: { predictedDemand: number; confidence: number },
    inventoryData: { currentStock: number; reorderPoint: number; stockoutRisk: number },
    supplierData: { leadTime: number; reliability: number }
  ): Promise<RiskAnalysisResult> {
    const product = await storage.getProductById(productId);
    const location = await storage.getLocations();
    const currentLocation = location.find(l => l.id === locationId);

    // Calculate individual risk factors
    const stockoutRisk = this.calculateStockoutRisk(
      inventoryData.currentStock,
      demandForecast.predictedDemand,
      supplierData.leadTime
    );

    const costRisk = this.calculateCostRisk(
      product.unitCost,
      product.sellingPrice,
      inventoryData.currentStock
    );

    const supplierRisk = this.calculateSupplierRisk(
      supplierData.reliability,
      supplierData.leadTime
    );

    const demandVolatilityRisk = this.calculateDemandVolatilityRisk(
      demandForecast.confidence
    );

    // Compile risk factors
    const riskFactors: RiskFactor[] = [
      {
        type: 'stockout',
        severity: stockoutRisk,
        description: this.getStockoutDescription(stockoutRisk, inventoryData.currentStock, demandForecast.predictedDemand),
      },
      {
        type: 'cost',
        severity: costRisk,
        description: this.getCostDescription(costRisk, inventoryData.currentStock, product.unitCost),
      },
      {
        type: 'supplier',
        severity: supplierRisk,
        description: this.getSupplierDescription(supplierRisk, supplierData.reliability, supplierData.leadTime),
      },
      {
        type: 'demand_volatility',
        severity: demandVolatilityRisk,
        description: this.getDemandVolatilityDescription(demandVolatilityRisk, demandForecast.confidence),
      },
    ];

    // Calculate weighted overall risk
    const overallRisk = 
      stockoutRisk * this.weights.stockout +
      costRisk * this.weights.cost +
      supplierRisk * this.weights.supplier +
      demandVolatilityRisk * this.weights.demand_volatility;

    // Determine alert level
    let alertLevel: 'low' | 'medium' | 'high' | 'critical';
    if (overallRisk >= 0.75) alertLevel = 'critical';
    else if (overallRisk >= 0.5) alertLevel = 'high';
    else if (overallRisk >= 0.3) alertLevel = 'medium';
    else alertLevel = 'low';

    // Use AI to generate detailed analysis and mitigation strategies
    const systemPrompt = `You are a risk management expert specializing in supply chain and inventory risks.
Analyze risk factors and provide actionable mitigation strategies.
Focus on preventing stockouts, optimizing costs, and managing supplier relationships.`;

    const userPrompt = `Analyze the following inventory risk situation:

Product: ${product.name} (${product.sku})
Location: ${currentLocation?.name || 'Unknown'}
Category: ${product.category}

Risk Assessment:
- Overall Risk Score: ${(overallRisk * 100).toFixed(1)}%
- Alert Level: ${alertLevel.toUpperCase()}

Detailed Risk Factors:
1. Stockout Risk: ${(stockoutRisk * 100).toFixed(1)}%
   - Current Stock: ${inventoryData.currentStock} units
   - Predicted 30-day Demand: ${demandForecast.predictedDemand} units
   - Reorder Point: ${inventoryData.reorderPoint} units
   - Lead Time: ${supplierData.leadTime} days

2. Cost Risk: ${(costRisk * 100).toFixed(1)}%
   - Unit Cost: $${product.unitCost}
   - Selling Price: $${product.sellingPrice}
   - Current Inventory Value: $${(inventoryData.currentStock * product.unitCost).toFixed(2)}

3. Supplier Risk: ${(supplierRisk * 100).toFixed(1)}%
   - Supplier Reliability: ${(supplierData.reliability * 100).toFixed(1)}%
   - Lead Time: ${supplierData.leadTime} days

4. Demand Volatility Risk: ${(demandVolatilityRisk * 100).toFixed(1)}%
   - Forecast Confidence: ${(demandForecast.confidence * 100).toFixed(1)}%

Provide a JSON response with:
{
  "overallRisk": ${overallRisk},
  "riskFactors": ${JSON.stringify(riskFactors)},
  "mitigationStrategies": ["<strategy 1>", "<strategy 2>", ...],
  "reasoning": "<comprehensive risk analysis>",
  "alertLevel": "${alertLevel}"
}

Focus on providing 3-5 specific, actionable mitigation strategies prioritized by impact.`;

    try {
      const result = await getStructuredCompletion<RiskAnalysisResult>(
        systemPrompt,
        userPrompt
      );

      // Ensure data consistency
      result.overallRisk = overallRisk;
      result.riskFactors = riskFactors;
      result.alertLevel = alertLevel;

      return result;
    } catch (error) {
      console.error('Risk analysis error:', error);
      
      // Fallback analysis
      const mitigationStrategies = this.generateFallbackMitigations(
        stockoutRisk,
        costRisk,
        supplierRisk,
        demandVolatilityRisk
      );

      return {
        overallRisk,
        riskFactors,
        mitigationStrategies,
        reasoning: `Risk analysis complete. Overall risk level: ${alertLevel}. Primary concerns: ${
          riskFactors
            .filter(rf => rf.severity > 0.5)
            .map(rf => rf.type)
            .join(', ') || 'None'
        }. Fallback analysis used.`,
        alertLevel,
      };
    }
  }

  /**
   * Calculate stockout risk
   */
  private calculateStockoutRisk(
    currentStock: number,
    predictedMonthlyDemand: number,
    leadTimeDays: number
  ): number {
    const dailyDemand = predictedMonthlyDemand / 30;
    const leadTimeDemand = dailyDemand * leadTimeDays;
    const daysOfStockRemaining = currentStock / dailyDemand;
    
    if (daysOfStockRemaining <= leadTimeDays) {
      return Math.min(1.0, 1.0 - (daysOfStockRemaining / leadTimeDays) * 0.5);
    } else if (daysOfStockRemaining <= leadTimeDays * 2) {
      return 0.4;
    } else if (daysOfStockRemaining <= leadTimeDays * 3) {
      return 0.2;
    }
    return 0.1;
  }

  /**
   * Calculate cost risk (high holding costs)
   */
  private calculateCostRisk(
    unitCost: number,
    sellingPrice: number,
    currentStock: number
  ): number {
    const inventoryValue = unitCost * currentStock;
    const profitMargin = (sellingPrice - unitCost) / sellingPrice;
    
    // High inventory value with low margin = higher risk
    const valueRisk = Math.min(1.0, inventoryValue / 10000) * 0.5;
    const marginRisk = profitMargin < 0.3 ? 0.5 : profitMargin < 0.5 ? 0.3 : 0.1;
    
    return Math.min(1.0, valueRisk + marginRisk);
  }

  /**
   * Calculate supplier risk
   */
  private calculateSupplierRisk(
    reliability: number,
    leadTimeDays: number
  ): number {
    const reliabilityRisk = 1.0 - reliability;
    const leadTimeRisk = Math.min(1.0, leadTimeDays / 30);
    
    return (reliabilityRisk * 0.7 + leadTimeRisk * 0.3);
  }

  /**
   * Calculate demand volatility risk
   */
  private calculateDemandVolatilityRisk(
    forecastConfidence: number
  ): number {
    return 1.0 - forecastConfidence;
  }

  /**
   * Generate risk descriptions
   */
  private getStockoutDescription(risk: number, currentStock: number, demand: number): string {
    if (risk > 0.7) return `CRITICAL: Current stock (${currentStock}) insufficient for predicted demand (${demand}). Immediate action required.`;
    if (risk > 0.5) return `HIGH: Stock levels approaching critical. Reorder needed soon.`;
    if (risk > 0.3) return `MODERATE: Stock levels adequate but should be monitored.`;
    return `LOW: Stock levels healthy relative to demand.`;
  }

  private getCostDescription(risk: number, stock: number, unitCost: number): string {
    const value = stock * unitCost;
    if (risk > 0.6) return `HIGH: High inventory holding costs ($${value.toFixed(2)}). Consider reducing stock levels.`;
    if (risk > 0.4) return `MODERATE: Inventory costs manageable but could be optimized.`;
    return `LOW: Inventory costs well-controlled.`;
  }

  private getSupplierDescription(risk: number, reliability: number, leadTime: number): string {
    if (risk > 0.5) return `HIGH: Supplier reliability concerns (${(reliability * 100).toFixed(0)}%) or long lead time (${leadTime} days).`;
    if (risk > 0.3) return `MODERATE: Some supplier performance concerns.`;
    return `LOW: Supplier performing reliably.`;
  }

  private getDemandVolatilityDescription(risk: number, confidence: number): string {
    if (risk > 0.5) return `HIGH: Low forecast confidence (${(confidence * 100).toFixed(0)}%). Demand patterns uncertain.`;
    if (risk > 0.3) return `MODERATE: Some demand uncertainty.`;
    return `LOW: Demand forecast reliable.`;
  }

  /**
   * Generate fallback mitigation strategies
   */
  private generateFallbackMitigations(
    stockoutRisk: number,
    costRisk: number,
    supplierRisk: number,
    demandRisk: number
  ): string[] {
    const strategies: string[] = [];
    
    if (stockoutRisk > 0.5) {
      strategies.push('Place immediate order to prevent stockout');
      strategies.push('Increase safety stock levels for this product');
    }
    
    if (costRisk > 0.5) {
      strategies.push('Review and optimize inventory holding levels');
      strategies.push('Consider just-in-time ordering to reduce holding costs');
    }
    
    if (supplierRisk > 0.4) {
      strategies.push('Evaluate alternative suppliers for better reliability');
      strategies.push('Negotiate shorter lead times or establish backup suppliers');
    }
    
    if (demandRisk > 0.4) {
      strategies.push('Improve demand forecasting with additional data sources');
      strategies.push('Increase forecast review frequency');
    }
    
    if (strategies.length === 0) {
      strategies.push('Continue monitoring inventory levels');
      strategies.push('Maintain current inventory management practices');
    }
    
    return strategies.slice(0, 5); // Return top 5
  }
}

export const riskAgent = new RiskAgent();
