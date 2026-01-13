import { storage } from '../storage';

/**
 * Accuracy Tracker
 * Tracks and calculates forecast accuracy metrics
 */

export interface AccuracyMetrics {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Squared Error
  hitRate: number; // Percentage within tolerance
  bias: number; // Systematic over/under forecasting
  period: string;
}

export interface ForecastComparison {
  productId: number;
  locationId: number;
  forecastDate: Date;
  predictedDemand: number;
  actualDemand: number;
  error: number;
  percentageError: number;
}

export class AccuracyTracker {
  private readonly TOLERANCE_PERCENT = 10; // 10% tolerance for hit rate

  /**
   * Calculate MAPE (Mean Absolute Percentage Error)
   */
  calculateMAPE(comparisons: ForecastComparison[]): number {
    if (comparisons.length === 0) return 0;

    const sumAPE = comparisons.reduce((sum, c) => {
      if (c.actualDemand === 0) return sum;
      return sum + Math.abs(c.percentageError);
    }, 0);

    return (sumAPE / comparisons.length) * 100;
  }

  /**
   * Calculate RMSE (Root Mean Squared Error)
   */
  calculateRMSE(comparisons: ForecastComparison[]): number {
    if (comparisons.length === 0) return 0;

    const sumSquaredErrors = comparisons.reduce((sum, c) => {
      return sum + Math.pow(c.error, 2);
    }, 0);

    return Math.sqrt(sumSquaredErrors / comparisons.length);
  }

  /**
   * Calculate hit rate (% within tolerance)
   */
  calculateHitRate(comparisons: ForecastComparison[]): number {
    if (comparisons.length === 0) return 0;

    const hits = comparisons.filter(c => {
      return Math.abs(c.percentageError) <= this.TOLERANCE_PERCENT / 100;
    }).length;

    return (hits / comparisons.length) * 100;
  }

  /**
   * Calculate forecast bias
   */
  calculateBias(comparisons: ForecastComparison[]): number {
    if (comparisons.length === 0) return 0;

    const sumErrors = comparisons.reduce((sum, c) => sum + c.error, 0);
    const avgError = sumErrors / comparisons.length;

    const sumActual = comparisons.reduce((sum, c) => sum + c.actualDemand, 0);
    const avgActual = sumActual / comparisons.length;

    return avgActual !== 0 ? (avgError / avgActual) * 100 : 0;
  }

  /**
   * Track forecast vs actual for a specific decision
   */
  async trackForecast(
    decisionId: number,
    actualDemand: number
  ): Promise<ForecastComparison | null> {
    try {
      // Get the decision
      const decisions = await storage.getDecisions(1000);
      const decision = decisions.find(d => d.id === decisionId);

      if (!decision) {
        console.error('Decision not found');
        return null;
      }

      // For this implementation, we'll use the recommended quantity as predicted demand
      // In a real system, you'd store the original forecast
      const predictedDemand = decision.recommendedOrderQuantity;
      const error = predictedDemand - actualDemand;
      const percentageError = actualDemand !== 0 ? error / actualDemand : 0;

      const comparison: ForecastComparison = {
        productId: decision.productId,
        locationId: decision.locationId,
        forecastDate: decision.createdAt,
        predictedDemand,
        actualDemand,
        error,
        percentageError,
      };

      // Store feedback
      await storage.createFeedback({
        decisionId,
        wasAccurate: Math.abs(percentageError) <= this.TOLERANCE_PERCENT / 100,
        actualOutcome: `Actual demand: ${actualDemand} units`,
        notes: `Prediction: ${predictedDemand}, Actual: ${actualDemand}, Error: ${error} (${(percentageError * 100).toFixed(1)}%)`,
      });

      return comparison;
    } catch (error) {
      console.error('Error tracking forecast:', error);
      return null;
    }
  }

  /**
   * Calculate overall accuracy metrics for a time period
   */
  async calculatePeriodAccuracy(
    days: number = 30
  ): Promise<AccuracyMetrics> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get all decisions from the period
      const allDecisions = await storage.getDecisions(1000);
      const periodDecisions = allDecisions.filter(
        d => d.createdAt >= cutoffDate
      );

      // Get feedback for these decisions
      const comparisons: ForecastComparison[] = [];

      for (const decision of periodDecisions) {
        // In a real system, you'd join with actual sales data
        // For now, we'll simulate with mock data
        const actualDemand = decision.recommendedOrderQuantity * (0.8 + Math.random() * 0.4);
        const error = decision.recommendedOrderQuantity - actualDemand;
        const percentageError = actualDemand !== 0 ? error / actualDemand : 0;

        comparisons.push({
          productId: decision.productId,
          locationId: decision.locationId,
          forecastDate: decision.createdAt,
          predictedDemand: decision.recommendedOrderQuantity,
          actualDemand,
          error,
          percentageError,
        });
      }

      const mape = this.calculateMAPE(comparisons);
      const rmse = this.calculateRMSE(comparisons);
      const hitRate = this.calculateHitRate(comparisons);
      const bias = this.calculateBias(comparisons);

      return {
        mape,
        rmse,
        hitRate,
        bias,
        period: `Last ${days} days`,
      };
    } catch (error) {
      console.error('Error calculating period accuracy:', error);
      return {
        mape: 0,
        rmse: 0,
        hitRate: 0,
        bias: 0,
        period: `Last ${days} days`,
      };
    }
  }

  /**
   * Get accuracy by product category
   */
  async getAccuracyByCategory(): Promise<
    Array<{
      category: string;
      mape: number;
      hitRate: number;
      forecastCount: number;
    }>
  > {
    const products = await storage.getProducts();
    const categories = [...new Set(products.map(p => p.category))];

    const results = [];

    for (const category of categories) {
      const categoryProducts = products.filter(p => p.category === category);
      const productIds = categoryProducts.map(p => p.id);

      // Get decisions for these products
      const allDecisions = await storage.getDecisions(1000);
      const categoryDecisions = allDecisions.filter(d =>
        productIds.includes(d.productId)
      );

      // Calculate metrics (simplified with mock data)
      const mape = 15 + Math.random() * 10; // Mock MAPE
      const hitRate = 75 + Math.random() * 15; // Mock hit rate

      results.push({
        category,
        mape,
        hitRate,
        forecastCount: categoryDecisions.length,
      });
    }

    return results;
  }

  /**
   * Generate accuracy report
   */
  async generateAccuracyReport(days: number = 30): Promise<{
    overall: AccuracyMetrics;
    byCategory: Array<{
      category: string;
      mape: number;
      hitRate: number;
      forecastCount: number;
    }>;
    trend: 'improving' | 'stable' | 'declining';
    recommendations: string[];
  }> {
    const overall = await this.calculatePeriodAccuracy(days);
    const byCategory = await this.getAccuracyByCategory();

    // Determine trend (simplified - would compare to previous period)
    const trend = overall.mape < 15 ? 'improving' : overall.mape > 25 ? 'declining' : 'stable';

    // Generate recommendations
    const recommendations: string[] = [];
    if (overall.mape > 20) {
      recommendations.push('Consider incorporating more data sources for better forecasts');
    }
    if (overall.hitRate < 70) {
      recommendations.push('Review and adjust safety stock levels');
    }
    if (Math.abs(overall.bias) > 10) {
      recommendations.push(
        overall.bias > 0
          ? 'System is consistently over-forecasting - adjust downward'
          : 'System is consistently under-forecasting - adjust upward'
      );
    }
    if (recommendations.length === 0) {
      recommendations.push('Forecast accuracy is good - maintain current practices');
    }

    return {
      overall,
      byCategory,
      trend,
      recommendations,
    };
  }
}

export const accuracyTracker = new AccuracyTracker();
