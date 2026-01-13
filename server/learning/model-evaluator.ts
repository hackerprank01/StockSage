/**
 * Model Evaluator
 * Compares different AI models and configurations
 */

export interface ModelPerformance {
  modelId: string;
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  avgResponseTime: number;
  costPerPrediction: number;
  sampleSize: number;
}

export interface ABTestResult {
  testId: string;
  modelA: string;
  modelB: string;
  winner: string;
  confidenceLevel: number;
  statisticallySignificant: boolean;
  metrics: {
    modelA: ModelPerformance;
    modelB: ModelPerformance;
  };
}

export class ModelEvaluator {
  private activeTests: Map<string, ABTestResult> = new Map();

  /**
   * Evaluate a single model's performance
   */
  async evaluateModel(
    modelId: string,
    modelName: string,
    predictions: Array<{
      predicted: number;
      actual: number;
      responseTime: number;
    }>
  ): Promise<ModelPerformance> {
    if (predictions.length === 0) {
      return {
        modelId,
        modelName,
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        avgResponseTime: 0,
        costPerPrediction: 0,
        sampleSize: 0,
      };
    }

    // Calculate accuracy (within 10% tolerance)
    const accurate = predictions.filter(p => {
      const error = Math.abs(p.predicted - p.actual);
      const tolerance = p.actual * 0.1;
      return error <= tolerance;
    }).length;
    const accuracy = (accurate / predictions.length) * 100;

    // For classification-like metrics, we'll use thresholds
    // True Positive: predicted high demand and actual was high
    // False Positive: predicted high demand but actual was low
    // True Negative: predicted low demand and actual was low
    // False Negative: predicted low demand but actual was high

    const threshold = predictions.reduce((sum, p) => sum + p.actual, 0) / predictions.length;

    let tp = 0, fp = 0, tn = 0, fn = 0;

    predictions.forEach(p => {
      const predictedHigh = p.predicted >= threshold;
      const actualHigh = p.actual >= threshold;

      if (predictedHigh && actualHigh) tp++;
      else if (predictedHigh && !actualHigh) fp++;
      else if (!predictedHigh && !actualHigh) tn++;
      else fn++;
    });

    // Calculate precision, recall, F1
    const precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
    const recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    // Calculate average response time
    const avgResponseTime = predictions.reduce((sum, p) => sum + p.responseTime, 0) / predictions.length;

    // Estimate cost (simplified - would use actual API costs)
    const costPerPrediction = modelId.includes('gpt-4') ? 0.03 : modelId.includes('gpt-3.5') ? 0.002 : 0.01;

    return {
      modelId,
      modelName,
      accuracy,
      precision,
      recall,
      f1Score,
      avgResponseTime,
      costPerPrediction,
      sampleSize: predictions.length,
    };
  }

  /**
   * Run A/B test between two models
   */
  async startABTest(
    testId: string,
    modelAId: string,
    modelBId: string,
    trafficSplit: number = 0.5
  ): Promise<{
    testId: string;
    started: boolean;
    message: string;
  }> {
    if (this.activeTests.has(testId)) {
      return {
        testId,
        started: false,
        message: 'Test already running with this ID',
      };
    }

    // Initialize test
    this.activeTests.set(testId, {
      testId,
      modelA: modelAId,
      modelB: modelBId,
      winner: 'undetermined',
      confidenceLevel: 0,
      statisticallySignificant: false,
      metrics: {
        modelA: {
          modelId: modelAId,
          modelName: modelAId,
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          avgResponseTime: 0,
          costPerPrediction: 0,
          sampleSize: 0,
        },
        modelB: {
          modelId: modelBId,
          modelName: modelBId,
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          avgResponseTime: 0,
          costPerPrediction: 0,
          sampleSize: 0,
        },
      },
    });

    return {
      testId,
      started: true,
      message: `A/B test started: ${modelAId} vs ${modelBId} with ${trafficSplit * 100}%/${(1 - trafficSplit) * 100}% split`,
    };
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<ABTestResult | null> {
    return this.activeTests.get(testId) || null;
  }

  /**
   * Determine statistical significance
   */
  private isStatisticallySignificant(
    performanceA: ModelPerformance,
    performanceB: ModelPerformance,
    confidenceLevel: number = 0.95
  ): boolean {
    // Simplified significance test
    // In production, would use proper statistical tests (t-test, chi-square, etc.)
    
    const minSampleSize = 100;
    if (performanceA.sampleSize < minSampleSize || performanceB.sampleSize < minSampleSize) {
      return false;
    }

    const accuracyDiff = Math.abs(performanceA.accuracy - performanceB.accuracy);
    const minMeaningfulDiff = 5; // 5% difference considered meaningful

    return accuracyDiff >= minMeaningfulDiff;
  }

  /**
   * Calculate confidence level for test
   */
  private calculateConfidence(
    performanceA: ModelPerformance,
    performanceB: ModelPerformance
  ): number {
    // Simplified confidence calculation
    const sampleSizeFactor = Math.min(
      1,
      (performanceA.sampleSize + performanceB.sampleSize) / 200
    );
    
    const accuracyDiff = Math.abs(performanceA.accuracy - performanceB.accuracy);
    const diffFactor = Math.min(1, accuracyDiff / 10);

    return sampleSizeFactor * diffFactor * 100;
  }

  /**
   * Evaluate and compare models
   */
  async compareModels(
    models: Array<{
      modelId: string;
      modelName: string;
      predictions: Array<{
        predicted: number;
        actual: number;
        responseTime: number;
      }>;
    }>
  ): Promise<{
    rankings: ModelPerformance[];
    recommendation: string;
  }> {
    const performances: ModelPerformance[] = [];

    for (const model of models) {
      const performance = await this.evaluateModel(
        model.modelId,
        model.modelName,
        model.predictions
      );
      performances.push(performance);
    }

    // Rank by composite score (weighted)
    const weights = {
      accuracy: 0.4,
      f1Score: 0.3,
      responseTime: 0.2, // Lower is better
      cost: 0.1, // Lower is better
    };

    const maxResponseTime = Math.max(...performances.map(p => p.avgResponseTime));
    const maxCost = Math.max(...performances.map(p => p.costPerPrediction));

    performances.forEach(p => {
      const normalizedResponseTime = 100 * (1 - p.avgResponseTime / maxResponseTime);
      const normalizedCost = 100 * (1 - p.costPerPrediction / maxCost);

      (p as any).compositeScore =
        p.accuracy * weights.accuracy +
        p.f1Score * weights.f1Score +
        normalizedResponseTime * weights.responseTime +
        normalizedCost * weights.cost;
    });

    performances.sort((a, b) => (b as any).compositeScore - (a as any).compositeScore);

    const best = performances[0];
    const recommendation = `Recommended model: ${best.modelName} with ${best.accuracy.toFixed(1)}% accuracy, ${best.f1Score.toFixed(1)} F1-score, and ${best.avgResponseTime.toFixed(0)}ms avg response time.`;

    return {
      rankings: performances,
      recommendation,
    };
  }

  /**
   * Auto-promote better model
   */
  async autoPromoteModel(
    testId: string
  ): Promise<{
    promoted: boolean;
    promotedModel: string;
    reason: string;
  }> {
    const test = this.activeTests.get(testId);

    if (!test) {
      return {
        promoted: false,
        promotedModel: '',
        reason: 'Test not found',
      };
    }

    if (!test.statisticallySignificant) {
      return {
        promoted: false,
        promotedModel: '',
        reason: 'Results not statistically significant yet',
      };
    }

    const modelA = test.metrics.modelA;
    const modelB = test.metrics.modelB;

    if (modelA.accuracy > modelB.accuracy) {
      return {
        promoted: true,
        promotedModel: modelA.modelId,
        reason: `Model A (${modelA.modelName}) showed ${(modelA.accuracy - modelB.accuracy).toFixed(1)}% better accuracy`,
      };
    } else {
      return {
        promoted: true,
        promotedModel: modelB.modelId,
        reason: `Model B (${modelB.modelName}) showed ${(modelB.accuracy - modelA.accuracy).toFixed(1)}% better accuracy`,
      };
    }
  }
}

export const modelEvaluator = new ModelEvaluator();
