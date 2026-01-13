/**
 * Safety Stock Calculator
 * Calculates optimal safety stock levels based on demand variability and service levels
 */

export interface SafetyStockCalculation {
  safetyStock: number;
  serviceLevel: number;
  stockoutProbability: number;
  annualHoldingCost: number;
  reasoning: string;
}

export class SafetyStockCalculator {
  /**
   * Calculate safety stock using standard formula
   * Safety Stock = Z_score × demand_std_dev × √lead_time_days
   */
  calculateBasicSafetyStock(
    demandStdDev: number,
    leadTimeDays: number,
    serviceLevel: number = 0.95
  ): number {
    const zScore = this.getZScore(serviceLevel);
    const safetyStock = zScore * demandStdDev * Math.sqrt(leadTimeDays);
    return Math.ceil(safetyStock);
  }

  /**
   * Calculate advanced safety stock considering demand and lead time variability
   */
  calculateAdvancedSafetyStock(
    averageDailyDemand: number,
    demandStdDev: number,
    averageLeadTime: number,
    leadTimeStdDev: number,
    serviceLevel: number = 0.95,
    unitCost: number
  ): SafetyStockCalculation {
    const zScore = this.getZScore(serviceLevel);
    
    // Advanced formula: SS = Z × √(LT × σ_D² + D² × σ_LT²)
    // Where:
    // - LT = average lead time
    // - σ_D = standard deviation of demand
    // - D = average demand
    // - σ_LT = standard deviation of lead time
    
    const demandVariance = Math.pow(demandStdDev, 2);
    const leadTimeVariance = Math.pow(leadTimeStdDev, 2);
    
    const totalVariance = 
      (averageLeadTime * demandVariance) + 
      (Math.pow(averageDailyDemand, 2) * leadTimeVariance);
    
    const safetyStock = Math.ceil(zScore * Math.sqrt(totalVariance));
    
    // Calculate stockout probability
    const stockoutProbability = 1 - serviceLevel;
    
    // Calculate annual holding cost
    const annualHoldingCostRate = 0.25; // 25% of unit cost
    const annualHoldingCost = safetyStock * unitCost * annualHoldingCostRate;
    
    // Generate reasoning
    let reasoning = `Safety stock of ${safetyStock} units calculated for ${(serviceLevel * 100).toFixed(0)}% service level. `;
    reasoning += `This accounts for demand variability (σ=${demandStdDev.toFixed(1)}) and lead time variability (σ=${leadTimeStdDev.toFixed(1)} days). `;
    reasoning += `Expected stockout probability: ${(stockoutProbability * 100).toFixed(2)}%. `;
    reasoning += `Annual holding cost: $${annualHoldingCost.toFixed(2)}.`;
    
    return {
      safetyStock,
      serviceLevel,
      stockoutProbability,
      annualHoldingCost,
      reasoning,
    };
  }

  /**
   * Get Z-score for service level
   * Service level is the probability of not having a stockout
   */
  private getZScore(serviceLevel: number): number {
    const zScores: { [key: number]: number } = {
      0.50: 0.00,  // 50%
      0.80: 0.84,  // 80%
      0.85: 1.04,  // 85%
      0.90: 1.28,  // 90%
      0.95: 1.65,  // 95%
      0.96: 1.75,  // 96%
      0.97: 1.88,  // 97%
      0.98: 2.05,  // 98%
      0.99: 2.33,  // 99%
      0.995: 2.58, // 99.5%
      0.999: 3.09, // 99.9%
    };
    
    // Find closest service level
    const levels = Object.keys(zScores).map(Number);
    const closest = levels.reduce((prev, curr) => 
      Math.abs(curr - serviceLevel) < Math.abs(prev - serviceLevel) ? curr : prev
    );
    
    return zScores[closest];
  }

  /**
   * Calculate service level from stockout tolerance
   */
  serviceLevelFromStockoutTolerance(stockoutsPerYear: number): number {
    // Assuming weekly reviews (52 reviews per year)
    const reviewsPerYear = 52;
    const stockoutProbability = stockoutsPerYear / reviewsPerYear;
    const serviceLevel = 1 - stockoutProbability;
    
    // Clamp between 0.5 and 0.999
    return Math.max(0.5, Math.min(0.999, serviceLevel));
  }

  /**
   * Optimize safety stock considering cost tradeoff
   */
  optimizeSafetyStock(
    averageDailyDemand: number,
    demandStdDev: number,
    leadTimeDays: number,
    unitCost: number,
    holdingCostRate: number = 0.25,
    stockoutCostPerUnit: number = 0
  ): {
    optimalSafetyStock: number;
    optimalServiceLevel: number;
    totalCost: number;
    breakdown: {
      holdingCost: number;
      stockoutCost: number;
    };
    reasoning: string;
  } {
    // If no stockout cost provided, estimate as lost margin
    if (stockoutCostPerUnit === 0) {
      stockoutCostPerUnit = unitCost * 0.5; // Assume 50% margin
    }
    
    // Test different service levels
    const serviceLevels = [0.85, 0.90, 0.95, 0.97, 0.99];
    let bestLevel = 0.95;
    let lowestCost = Infinity;
    let bestSafetyStock = 0;
    
    for (const level of serviceLevels) {
      const ss = this.calculateBasicSafetyStock(demandStdDev, leadTimeDays, level);
      
      // Calculate annual holding cost
      const holdingCost = ss * unitCost * holdingCostRate;
      
      // Calculate expected stockout cost
      const stockoutProbability = 1 - level;
      const expectedStockoutsPerYear = stockoutProbability * 365 / leadTimeDays;
      const averageStockoutSize = demandStdDev * 0.5; // Simplified estimate
      const stockoutCost = expectedStockoutsPerYear * averageStockoutSize * stockoutCostPerUnit;
      
      const totalCost = holdingCost + stockoutCost;
      
      if (totalCost < lowestCost) {
        lowestCost = totalCost;
        bestLevel = level;
        bestSafetyStock = ss;
      }
    }
    
    // Recalculate for best level
    const finalHoldingCost = bestSafetyStock * unitCost * holdingCostRate;
    const finalStockoutProb = 1 - bestLevel;
    const finalExpectedStockouts = finalStockoutProb * 365 / leadTimeDays;
    const finalStockoutCost = finalExpectedStockouts * demandStdDev * 0.5 * stockoutCostPerUnit;
    
    const reasoning = `Optimal safety stock of ${bestSafetyStock} units at ${(bestLevel * 100).toFixed(0)}% service level minimizes total cost. ` +
      `Annual holding cost: $${finalHoldingCost.toFixed(2)}, Expected stockout cost: $${finalStockoutCost.toFixed(2)}, Total: $${lowestCost.toFixed(2)}.`;
    
    return {
      optimalSafetyStock: bestSafetyStock,
      optimalServiceLevel: bestLevel,
      totalCost: lowestCost,
      breakdown: {
        holdingCost: finalHoldingCost,
        stockoutCost: finalStockoutCost,
      },
      reasoning,
    };
  }

  /**
   * Calculate safety stock for seasonal products
   */
  calculateSeasonalSafetyStock(
    averageDailyDemand: number,
    demandStdDev: number,
    leadTimeDays: number,
    seasonalityFactor: number, // 1.0 = normal, >1.0 = peak season, <1.0 = off-season
    serviceLevel: number = 0.95
  ): {
    safetyStock: number;
    adjustment: string;
    reasoning: string;
  } {
    // Base safety stock
    const baseSafetyStock = this.calculateBasicSafetyStock(demandStdDev, leadTimeDays, serviceLevel);
    
    // Adjust for seasonality
    let adjustedSafetyStock = baseSafetyStock;
    let adjustment = 'No adjustment';
    let reasoning = `Base safety stock: ${baseSafetyStock} units for ${(serviceLevel * 100).toFixed(0)}% service level. `;
    
    if (seasonalityFactor > 1.2) {
      // Peak season - increase safety stock
      adjustedSafetyStock = Math.ceil(baseSafetyStock * seasonalityFactor);
      adjustment = `Increased by ${((seasonalityFactor - 1) * 100).toFixed(0)}% for peak season`;
      reasoning += `Adjusted to ${adjustedSafetyStock} units for peak season (${seasonalityFactor.toFixed(1)}x normal demand).`;
    } else if (seasonalityFactor < 0.8) {
      // Off-season - can reduce safety stock
      adjustedSafetyStock = Math.ceil(baseSafetyStock * Math.max(0.6, seasonalityFactor));
      adjustment = `Reduced by ${((1 - Math.max(0.6, seasonalityFactor)) * 100).toFixed(0)}% for off-season`;
      reasoning += `Adjusted to ${adjustedSafetyStock} units for off-season (${seasonalityFactor.toFixed(1)}x normal demand).`;
    } else {
      reasoning += 'No seasonal adjustment needed.';
    }
    
    return {
      safetyStock: adjustedSafetyStock,
      adjustment,
      reasoning,
    };
  }

  /**
   * Calculate minimum safety stock for critical items
   */
  calculateMinimumSafetyStock(
    averageDailyDemand: number,
    leadTimeDays: number,
    criticality: 'low' | 'medium' | 'high'
  ): {
    minimumSafetyStock: number;
    serviceLevel: number;
    reasoning: string;
  } {
    // Set minimum service levels based on criticality
    const serviceLevels = {
      low: 0.90,
      medium: 0.95,
      high: 0.99,
    };
    
    const serviceLevel = serviceLevels[criticality];
    
    // Minimum safety stock should cover at least the lead time demand
    const leadTimeDemand = averageDailyDemand * leadTimeDays;
    const minimumSafetyStock = Math.ceil(leadTimeDemand * 0.5); // 50% of lead time demand
    
    const reasoning = `Minimum safety stock of ${minimumSafetyStock} units for ${criticality} criticality item (${(serviceLevel * 100).toFixed(0)}% service level). ` +
      `This covers ${(minimumSafetyStock / averageDailyDemand).toFixed(1)} days of average demand.`;
    
    return {
      minimumSafetyStock,
      serviceLevel,
      reasoning,
    };
  }
}

export const safetyStockCalculator = new SafetyStockCalculator();
