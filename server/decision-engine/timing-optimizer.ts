/**
 * Timing Optimizer
 * Calculates optimal reorder points and timing
 */

export interface ReorderPointCalculation {
  reorderPoint: number;
  leadTimeDemand: number;
  safetyStock: number;
  daysUntilReorder: number;
  recommendedReorderDate: Date;
  reasoning: string;
}

export class TimingOptimizer {
  /**
   * Calculate Reorder Point (ROP)
   * ROP = (average_daily_demand × lead_time_days) + safety_stock
   */
  calculateReorderPoint(
    averageDailyDemand: number,
    leadTimeDays: number,
    safetyStock: number
  ): number {
    const leadTimeDemand = averageDailyDemand * leadTimeDays;
    const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);
    return reorderPoint;
  }

  /**
   * Calculate optimal reorder point with variability considerations
   */
  calculateOptimalReorderPoint(
    predictedMonthlyDemand: number,
    leadTimeDays: number,
    demandStdDev: number,
    leadTimeStdDev: number = 0,
    serviceLevel: number = 0.95, // 95% service level
    currentStock: number
  ): ReorderPointCalculation {
    // Calculate average daily demand
    const averageDailyDemand = predictedMonthlyDemand / 30;
    
    // Calculate lead time demand
    const leadTimeDemand = averageDailyDemand * leadTimeDays;
    
    // Get Z-score for service level
    const zScore = this.getZScore(serviceLevel);
    
    // Calculate safety stock considering both demand and lead time variability
    // Safety Stock = Z × √(lead_time × demand_variance + avg_demand² × lead_time_variance)
    const demandVariance = Math.pow(demandStdDev, 2);
    const leadTimeVariance = Math.pow(leadTimeStdDev, 2);
    
    const safetyStockVariance = 
      (leadTimeDays * demandVariance) + 
      (Math.pow(averageDailyDemand, 2) * leadTimeVariance);
    
    const safetyStock = Math.ceil(zScore * Math.sqrt(safetyStockVariance));
    
    // Calculate reorder point
    const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);
    
    // Calculate days until reorder is needed
    let daysUntilReorder = 0;
    if (currentStock > reorderPoint) {
      daysUntilReorder = Math.floor((currentStock - reorderPoint) / averageDailyDemand);
    } else {
      daysUntilReorder = 0; // Reorder needed immediately
    }
    
    // Calculate recommended reorder date
    const recommendedReorderDate = new Date();
    recommendedReorderDate.setDate(recommendedReorderDate.getDate() + daysUntilReorder);
    
    // Generate reasoning
    let reasoning = `Reorder point calculated at ${reorderPoint} units based on ${leadTimeDays}-day lead time and ${averageDailyDemand.toFixed(1)} units/day demand. `;
    reasoning += `Safety stock of ${safetyStock} units ensures ${(serviceLevel * 100).toFixed(0)}% service level. `;
    
    if (daysUntilReorder === 0) {
      reasoning += `Current stock (${currentStock}) is at or below reorder point. Order immediately!`;
    } else if (daysUntilReorder <= 3) {
      reasoning += `Current stock (${currentStock}) will reach reorder point in ${daysUntilReorder} days. Order soon.`;
    } else {
      reasoning += `Current stock (${currentStock}) sufficient for approximately ${daysUntilReorder} days. Next reorder around ${recommendedReorderDate.toLocaleDateString()}.`;
    }
    
    return {
      reorderPoint,
      leadTimeDemand,
      safetyStock,
      daysUntilReorder,
      recommendedReorderDate,
      reasoning,
    };
  }

  /**
   * Get Z-score for service level
   */
  private getZScore(serviceLevel: number): number {
    const zScores: { [key: number]: number } = {
      0.50: 0.00,
      0.80: 0.84,
      0.85: 1.04,
      0.90: 1.28,
      0.95: 1.65,
      0.96: 1.75,
      0.97: 1.88,
      0.98: 2.05,
      0.99: 2.33,
      0.995: 2.58,
      0.999: 3.09,
    };
    
    // Find closest service level
    const levels = Object.keys(zScores).map(Number);
    const closest = levels.reduce((prev, curr) => 
      Math.abs(curr - serviceLevel) < Math.abs(prev - serviceLevel) ? curr : prev
    );
    
    return zScores[closest];
  }

  /**
   * Calculate review period for periodic review system
   */
  calculateReviewPeriod(
    annualDemand: number,
    orderingCost: number,
    holdingCostPerUnit: number,
    workingDaysPerYear: number = 250
  ): {
    reviewPeriodDays: number;
    ordersPerYear: number;
    reasoning: string;
  } {
    if (holdingCostPerUnit <= 0 || orderingCost <= 0) {
      return {
        reviewPeriodDays: 30,
        ordersPerYear: 12,
        reasoning: 'Default monthly review period due to invalid cost parameters.',
      };
    }
    
    // Calculate EOQ to determine optimal order frequency
    const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
    
    // Calculate orders per year
    const ordersPerYear = annualDemand / eoq;
    
    // Calculate review period in days
    const reviewPeriodDays = Math.round(workingDaysPerYear / ordersPerYear);
    
    const reasoning = `Based on EOQ analysis, optimal review period is ${reviewPeriodDays} days (approximately ${ordersPerYear.toFixed(1)} orders per year).`;
    
    return {
      reviewPeriodDays,
      ordersPerYear,
      reasoning,
    };
  }

  /**
   * Optimize order timing considering promotions and events
   */
  optimizeTimingForEvents(
    normalReorderDate: Date,
    upcomingEvents: Array<{
      date: Date;
      expectedImpact: number; // -1 to +1
      type: string;
    }>
  ): {
    recommendedDate: Date;
    adjustment: string;
    reasoning: string;
  } {
    let recommendedDate = new Date(normalReorderDate);
    let adjustment = 'No adjustment';
    let reasoning = 'Normal reorder schedule maintained.';
    
    // Check for high-impact events within 30 days
    const thirtyDaysOut = new Date(normalReorderDate);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    
    const relevantEvents = upcomingEvents.filter(event => 
      event.date >= normalReorderDate && event.date <= thirtyDaysOut
    );
    
    if (relevantEvents.length > 0) {
      const highImpactEvents = relevantEvents.filter(e => Math.abs(e.expectedImpact) > 0.3);
      
      if (highImpactEvents.length > 0) {
        const nearestEvent = highImpactEvents.reduce((prev, curr) => 
          curr.date < prev.date ? curr : prev
        );
        
        if (nearestEvent.expectedImpact > 0.3) {
          // Positive impact (increased demand) - order earlier
          const daysEarlier = Math.ceil(nearestEvent.expectedImpact * 7);
          recommendedDate.setDate(recommendedDate.getDate() - daysEarlier);
          adjustment = `Order ${daysEarlier} days earlier`;
          reasoning = `${nearestEvent.type} on ${nearestEvent.date.toLocaleDateString()} expected to increase demand by ${(nearestEvent.expectedImpact * 100).toFixed(0)}%. Ordering earlier to prepare.`;
        }
      }
    }
    
    return {
      recommendedDate,
      adjustment,
      reasoning,
    };
  }

  /**
   * Calculate lead time with variability
   */
  calculateLeadTimeWithVariability(
    averageLeadTime: number,
    leadTimeStdDev: number,
    confidenceLevel: number = 0.95
  ): {
    plannedLeadTime: number;
    reasoning: string;
  } {
    const zScore = this.getZScore(confidenceLevel);
    const plannedLeadTime = Math.ceil(averageLeadTime + (zScore * leadTimeStdDev));
    
    const reasoning = `Planned lead time of ${plannedLeadTime} days accounts for average ${averageLeadTime} days plus ${(confidenceLevel * 100).toFixed(0)}% confidence buffer.`;
    
    return {
      plannedLeadTime,
      reasoning,
    };
  }
}

export const timingOptimizer = new TimingOptimizer();
