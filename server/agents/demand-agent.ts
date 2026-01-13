import { getStructuredCompletion } from '../openai';
import { storage } from '../storage';
import type { SalesHistory, Event } from '@shared/schema';

export interface DemandForecastResult {
  predictedDemand: number;
  confidence: number;
  reasoning: string;
  timeHorizon: string;
  seasonalFactors: {
    trend: 'increasing' | 'decreasing' | 'stable';
    seasonality: 'high' | 'medium' | 'low';
    promotionImpact: number;
  };
}

/**
 * Demand Forecasting Agent
 * Analyzes historical sales data and predicts future demand
 */
export class DemandAgent {
  /**
   * Forecast demand for a product at a location
   */
  async forecast(
    productId: number,
    locationId: number,
    timeHorizonDays: number = 30
  ): Promise<DemandForecastResult> {
    // Fetch historical sales data
    const salesHistory = await storage.getSalesHistory(productId, locationId, 90);
    
    if (salesHistory.length === 0) {
      return {
        predictedDemand: 0,
        confidence: 0.1,
        reasoning: 'No historical sales data available for this product-location combination.',
        timeHorizon: `${timeHorizonDays} days`,
        seasonalFactors: {
          trend: 'stable',
          seasonality: 'low',
          promotionImpact: 0,
        },
      };
    }

    // Get product details
    const product = await storage.getProductById(productId);
    
    // Get upcoming events that might affect demand
    const upcomingEvents = await storage.getUpcomingEvents(timeHorizonDays);
    const relevantEvents = upcomingEvents.filter(event => 
      event.affectedCategories && 
      Array.isArray(event.affectedCategories) && 
      event.affectedCategories.includes(product.category)
    );

    // Calculate basic statistics
    const stats = this.calculateStatistics(salesHistory);
    
    // Prepare data for AI analysis
    const systemPrompt = `You are a demand forecasting expert specializing in inventory management. 
Analyze historical sales data and predict future demand with high accuracy.
Consider seasonality, trends, promotions, and upcoming events.
Focus on providing actionable insights with clear reasoning.`;

    const userPrompt = `Analyze the following sales data and forecast demand for the next ${timeHorizonDays} days.

Product: ${product.name} (${product.sku})
Category: ${product.category}

Sales Statistics (Last 90 days):
- Total Sales: ${stats.totalQuantity} units
- Average Daily Sales: ${stats.avgDailyQuantity.toFixed(2)} units
- Standard Deviation: ${stats.stdDev.toFixed(2)}
- Trend: ${stats.trend}
- Recent 30-day Average: ${stats.recent30DayAvg.toFixed(2)} units/day
- Promotion Rate: ${(stats.promotionRate * 100).toFixed(1)}%
- Weekend vs Weekday Multiplier: ${stats.weekendMultiplier.toFixed(2)}x

Upcoming Events in next ${timeHorizonDays} days:
${relevantEvents.length > 0 ? relevantEvents.map(e => 
  `- ${e.name} (${e.eventType}): Expected impact ${(e.expectedImpact * 100).toFixed(0)}%`
).join('\n') : 'None'}

Provide a JSON response with:
{
  "predictedDemand": <total units expected in ${timeHorizonDays} days>,
  "confidence": <0-1 score>,
  "reasoning": "<detailed explanation of forecast>",
  "timeHorizon": "${timeHorizonDays} days",
  "seasonalFactors": {
    "trend": "<increasing|decreasing|stable>",
    "seasonality": "<high|medium|low>",
    "promotionImpact": <0-1 score>
  }
}`;

    try {
      const result = await getStructuredCompletion<DemandForecastResult>(
        systemPrompt,
        userPrompt
      );

      // Validate and adjust if needed
      if (result.predictedDemand < 0) {
        result.predictedDemand = 0;
      }
      
      if (result.confidence < 0 || result.confidence > 1) {
        result.confidence = Math.max(0, Math.min(1, result.confidence));
      }

      return result;
    } catch (error) {
      console.error('Demand forecasting error:', error);
      
      // Fallback to statistical forecast
      const fallbackDemand = stats.recent30DayAvg * timeHorizonDays;
      return {
        predictedDemand: Math.round(fallbackDemand),
        confidence: 0.6,
        reasoning: `Fallback statistical forecast based on recent 30-day average (${stats.recent30DayAvg.toFixed(2)} units/day). AI analysis unavailable.`,
        timeHorizon: `${timeHorizonDays} days`,
        seasonalFactors: {
          trend: stats.trend as 'increasing' | 'decreasing' | 'stable',
          seasonality: 'medium',
          promotionImpact: stats.promotionRate,
        },
      };
    }
  }

  /**
   * Calculate statistics from sales history
   */
  private calculateStatistics(salesHistory: SalesHistory[]) {
    const quantities = salesHistory.map(s => s.quantitySold);
    const totalQuantity = quantities.reduce((sum, q) => sum + q, 0);
    const avgDailyQuantity = totalQuantity / salesHistory.length;
    
    // Calculate standard deviation
    const variance = quantities.reduce((sum, q) => sum + Math.pow(q - avgDailyQuantity, 2), 0) / quantities.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate trend (comparing first half vs second half)
    const midPoint = Math.floor(salesHistory.length / 2);
    const firstHalfAvg = salesHistory.slice(0, midPoint).reduce((sum, s) => sum + s.quantitySold, 0) / midPoint;
    const secondHalfAvg = salesHistory.slice(midPoint).reduce((sum, s) => sum + s.quantitySold, 0) / (salesHistory.length - midPoint);
    const trendDiff = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    
    let trend: string;
    if (trendDiff > 10) trend = 'increasing';
    else if (trendDiff < -10) trend = 'decreasing';
    else trend = 'stable';
    
    // Recent 30-day average
    const recent30Days = salesHistory.slice(0, Math.min(30, salesHistory.length));
    const recent30DayAvg = recent30Days.reduce((sum, s) => sum + s.quantitySold, 0) / recent30Days.length;
    
    // Promotion rate
    const promotionCount = salesHistory.filter(s => s.isPromotion).length;
    const promotionRate = promotionCount / salesHistory.length;
    
    // Weekend multiplier
    const weekendSales = salesHistory.filter(s => {
      const date = new Date(s.date);
      const day = date.getDay();
      return day === 0 || day === 6;
    });
    const weekdaySales = salesHistory.filter(s => {
      const date = new Date(s.date);
      const day = date.getDay();
      return day !== 0 && day !== 6;
    });
    
    const weekendAvg = weekendSales.length > 0 
      ? weekendSales.reduce((sum, s) => sum + s.quantitySold, 0) / weekendSales.length 
      : avgDailyQuantity;
    const weekdayAvg = weekdaySales.length > 0 
      ? weekdaySales.reduce((sum, s) => sum + s.quantitySold, 0) / weekdaySales.length 
      : avgDailyQuantity;
    
    const weekendMultiplier = weekdayAvg > 0 ? weekendAvg / weekdayAvg : 1;
    
    return {
      totalQuantity,
      avgDailyQuantity,
      stdDev,
      trend,
      recent30DayAvg,
      promotionRate,
      weekendMultiplier,
    };
  }
}

export const demandAgent = new DemandAgent();
