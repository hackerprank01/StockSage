/**
 * Risk Scorer
 * Calculates weighted risk scores for inventory decisions
 */

export interface RiskScore {
  overallRisk: number; // 0-1
  components: {
    stockoutRisk: number;
    costRisk: number;
    supplierRisk: number;
    demandVolatilityRisk: number;
  };
  weights: {
    stockout: number;
    cost: number;
    supplier: number;
    demandVolatility: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
}

export class RiskScorer {
  // Default risk weights
  private defaultWeights = {
    stockout: 0.4,
    cost: 0.2,
    supplier: 0.25,
    demandVolatility: 0.15,
  };

  /**
   * Calculate comprehensive risk score
   */
  calculateRiskScore(
    stockoutRisk: number,
    costRisk: number,
    supplierRisk: number,
    demandVolatilityRisk: number,
    customWeights?: Partial<typeof this.defaultWeights>
  ): RiskScore {
    // Use custom weights if provided, otherwise use defaults
    const weights = { ...this.defaultWeights, ...customWeights };
    
    // Normalize weights to sum to 1
    const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const normalizedWeights = {
      stockout: weights.stockout / weightSum,
      cost: weights.cost / weightSum,
      supplier: weights.supplier / weightSum,
      demandVolatility: weights.demandVolatility / weightSum,
    };
    
    // Calculate weighted overall risk
    const overallRisk = 
      stockoutRisk * normalizedWeights.stockout +
      costRisk * normalizedWeights.cost +
      supplierRisk * normalizedWeights.supplier +
      demandVolatilityRisk * normalizedWeights.demandVolatility;
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (overallRisk >= 0.75) riskLevel = 'critical';
    else if (overallRisk >= 0.5) riskLevel = 'high';
    else if (overallRisk >= 0.3) riskLevel = 'medium';
    else riskLevel = 'low';
    
    // Generate reasoning
    const topRisks = [
      { name: 'Stockout', value: stockoutRisk, weight: normalizedWeights.stockout },
      { name: 'Cost', value: costRisk, weight: normalizedWeights.cost },
      { name: 'Supplier', value: supplierRisk, weight: normalizedWeights.supplier },
      { name: 'Demand Volatility', value: demandVolatilityRisk, weight: normalizedWeights.demandVolatility },
    ].sort((a, b) => (b.value * b.weight) - (a.value * a.weight));
    
    let reasoning = `Overall risk score: ${(overallRisk * 100).toFixed(1)}% (${riskLevel}). `;
    reasoning += `Top risk factors: ${topRisks.slice(0, 2).map(r => 
      `${r.name} ${(r.value * 100).toFixed(0)}%`
    ).join(', ')}. `;
    
    return {
      overallRisk,
      components: {
        stockoutRisk,
        costRisk,
        supplierRisk,
        demandVolatilityRisk,
      },
      weights: normalizedWeights,
      riskLevel,
      reasoning,
    };
  }

  /**
   * Calculate stockout risk score
   */
  calculateStockoutRisk(
    currentStock: number,
    dailyDemand: number,
    leadTimeDays: number,
    reorderPoint: number
  ): number {
    const daysOfStockRemaining = currentStock / dailyDemand;
    
    if (daysOfStockRemaining <= 0) {
      return 1.0; // Critical - already out of stock
    } else if (daysOfStockRemaining < leadTimeDays) {
      // High risk - will run out before new stock arrives
      return 0.9 - (daysOfStockRemaining / leadTimeDays) * 0.4;
    } else if (currentStock < reorderPoint) {
      // Medium risk - below reorder point
      return 0.5;
    } else if (currentStock < reorderPoint * 1.5) {
      // Low-medium risk - approaching reorder point
      return 0.3;
    } else {
      // Low risk - adequate stock
      return 0.1;
    }
  }

  /**
   * Calculate cost risk score
   */
  calculateCostRisk(
    inventoryValue: number,
    profitMargin: number,
    turnoverRate: number // inventory turns per year
  ): number {
    // High inventory value with low margin = high risk
    const valueRisk = Math.min(1.0, inventoryValue / 50000) * 0.4;
    
    // Low profit margin = higher risk
    let marginRisk = 0;
    if (profitMargin < 0.15) marginRisk = 0.4;
    else if (profitMargin < 0.25) marginRisk = 0.3;
    else if (profitMargin < 0.35) marginRisk = 0.2;
    else marginRisk = 0.1;
    
    // Low turnover = higher holding costs
    let turnoverRisk = 0;
    if (turnoverRate < 2) turnoverRisk = 0.3;
    else if (turnoverRate < 4) turnoverRisk = 0.2;
    else if (turnoverRate < 8) turnoverRisk = 0.1;
    else turnoverRisk = 0.05;
    
    return Math.min(1.0, valueRisk + marginRisk + turnoverRisk);
  }

  /**
   * Calculate supplier risk score
   */
  calculateSupplierRisk(
    supplierReliability: number,
    leadTimeDays: number,
    hasBackupSupplier: boolean,
    supplierPerformanceHistory?: {
      onTimeDeliveryRate: number;
      qualityIssueRate: number;
    }
  ): number {
    // Base risk from reliability
    const reliabilityRisk = (1 - supplierReliability) * 0.5;
    
    // Lead time risk
    let leadTimeRisk = 0;
    if (leadTimeDays > 30) leadTimeRisk = 0.3;
    else if (leadTimeDays > 14) leadTimeRisk = 0.2;
    else if (leadTimeDays > 7) leadTimeRisk = 0.1;
    else leadTimeRisk = 0.05;
    
    // Backup supplier mitigation
    const backupMitigation = hasBackupSupplier ? 0.8 : 1.0;
    
    // Performance history risk
    let performanceRisk = 0;
    if (supplierPerformanceHistory) {
      const onTimeRisk = (1 - supplierPerformanceHistory.onTimeDeliveryRate) * 0.3;
      const qualityRisk = supplierPerformanceHistory.qualityIssueRate * 0.2;
      performanceRisk = onTimeRisk + qualityRisk;
    }
    
    const totalRisk = (reliabilityRisk + leadTimeRisk + performanceRisk) * backupMitigation;
    return Math.min(1.0, totalRisk);
  }

  /**
   * Calculate demand volatility risk score
   */
  calculateDemandVolatilityRisk(
    demandStdDev: number,
    averageDemand: number,
    forecastAccuracy: number, // 0-1
    trendStability: 'stable' | 'increasing' | 'decreasing' | 'volatile'
  ): number {
    // Coefficient of variation (CV) = std dev / mean
    const coefficientOfVariation = averageDemand > 0 ? demandStdDev / averageDemand : 1;
    
    // CV risk
    let cvRisk = 0;
    if (coefficientOfVariation > 0.5) cvRisk = 0.4;
    else if (coefficientOfVariation > 0.3) cvRisk = 0.3;
    else if (coefficientOfVariation > 0.15) cvRisk = 0.2;
    else cvRisk = 0.1;
    
    // Forecast accuracy risk
    const forecastRisk = (1 - forecastAccuracy) * 0.3;
    
    // Trend stability risk
    const trendRisk = {
      stable: 0.05,
      increasing: 0.1,
      decreasing: 0.15,
      volatile: 0.3,
    }[trendStability];
    
    return Math.min(1.0, cvRisk + forecastRisk + trendRisk);
  }

  /**
   * Adjust risk score based on product criticality
   */
  adjustForCriticality(
    baseRiskScore: number,
    criticality: 'low' | 'medium' | 'high' | 'critical'
  ): {
    adjustedScore: number;
    adjustment: number;
    reasoning: string;
  } {
    const adjustments = {
      low: 0.8,      // Lower perceived risk for non-critical items
      medium: 1.0,   // No adjustment
      high: 1.2,     // Increase perceived risk for important items
      critical: 1.5, // Significantly increase risk for critical items
    };
    
    const adjustment = adjustments[criticality];
    const adjustedScore = Math.min(1.0, baseRiskScore * adjustment);
    
    let reasoning = '';
    if (adjustment !== 1.0) {
      reasoning = `Risk score adjusted ${adjustment > 1 ? 'up' : 'down'} by ${((adjustment - 1) * 100).toFixed(0)}% due to ${criticality} criticality level.`;
    } else {
      reasoning = 'No criticality adjustment applied.';
    }
    
    return {
      adjustedScore,
      adjustment,
      reasoning,
    };
  }

  /**
   * Calculate composite risk score for decision making
   */
  calculateDecisionRisk(params: {
    currentStock: number;
    dailyDemand: number;
    leadTimeDays: number;
    reorderPoint: number;
    inventoryValue: number;
    profitMargin: number;
    turnoverRate: number;
    supplierReliability: number;
    hasBackupSupplier: boolean;
    demandStdDev: number;
    forecastAccuracy: number;
    trendStability: 'stable' | 'increasing' | 'decreasing' | 'volatile';
    criticality?: 'low' | 'medium' | 'high' | 'critical';
    customWeights?: Partial<typeof this.defaultWeights>;
  }): RiskScore {
    // Calculate individual risk components
    const stockoutRisk = this.calculateStockoutRisk(
      params.currentStock,
      params.dailyDemand,
      params.leadTimeDays,
      params.reorderPoint
    );
    
    const costRisk = this.calculateCostRisk(
      params.inventoryValue,
      params.profitMargin,
      params.turnoverRate
    );
    
    const supplierRisk = this.calculateSupplierRisk(
      params.supplierReliability,
      params.leadTimeDays,
      params.hasBackupSupplier
    );
    
    const demandVolatilityRisk = this.calculateDemandVolatilityRisk(
      params.demandStdDev,
      params.dailyDemand,
      params.forecastAccuracy,
      params.trendStability
    );
    
    // Calculate composite score
    let riskScore = this.calculateRiskScore(
      stockoutRisk,
      costRisk,
      supplierRisk,
      demandVolatilityRisk,
      params.customWeights
    );
    
    // Adjust for criticality if specified
    if (params.criticality && params.criticality !== 'medium') {
      const adjustment = this.adjustForCriticality(riskScore.overallRisk, params.criticality);
      riskScore.overallRisk = adjustment.adjustedScore;
      
      // Re-determine risk level
      if (riskScore.overallRisk >= 0.75) riskScore.riskLevel = 'critical';
      else if (riskScore.overallRisk >= 0.5) riskScore.riskLevel = 'high';
      else if (riskScore.overallRisk >= 0.3) riskScore.riskLevel = 'medium';
      else riskScore.riskLevel = 'low';
      
      riskScore.reasoning += ` ${adjustment.reasoning}`;
    }
    
    return riskScore;
  }
}

export const riskScorer = new RiskScorer();
