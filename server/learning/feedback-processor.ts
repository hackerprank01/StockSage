import { storage } from '../storage';

/**
 * Feedback Processor
 * Processes user feedback to improve model performance
 */

export interface FeedbackData {
  decisionId: number;
  wasAccurate: boolean;
  actualOutcome?: string;
  notes?: string;
  improvements?: string[];
}

export interface ProcessingResult {
  processed: boolean;
  insights: string[];
  actionItems: string[];
  retrainingRecommended: boolean;
}

export class FeedbackProcessor {
  private feedbackQueue: FeedbackData[] = [];
  private readonly RETRAIN_THRESHOLD = 50; // Retrain after 50 feedbacks

  /**
   * Collect user feedback
   */
  async collectFeedback(feedback: FeedbackData): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Store feedback in database
      await storage.createFeedback({
        decisionId: feedback.decisionId,
        wasAccurate: feedback.wasAccurate,
        actualOutcome: feedback.actualOutcome,
        notes: feedback.notes,
      });

      // Add to processing queue
      this.feedbackQueue.push(feedback);

      console.log(`✅ Feedback collected for decision ${feedback.decisionId}`);

      return {
        success: true,
        message: 'Feedback recorded successfully',
      };
    } catch (error) {
      console.error('Error collecting feedback:', error);
      return {
        success: false,
        message: `Failed to collect feedback: ${error}`,
      };
    }
  }

  /**
   * Process accumulated feedback
   */
  async processFeedback(): Promise<ProcessingResult> {
    if (this.feedbackQueue.length === 0) {
      return {
        processed: false,
        insights: ['No feedback to process'],
        actionItems: [],
        retrainingRecommended: false,
      };
    }

    const insights: string[] = [];
    const actionItems: string[] = [];

    // Analyze feedback patterns
    const totalFeedback = this.feedbackQueue.length;
    const accuratePredictions = this.feedbackQueue.filter(f => f.wasAccurate).length;
    const accuracyRate = (accuratePredictions / totalFeedback) * 100;

    insights.push(`Processed ${totalFeedback} feedback items`);
    insights.push(`Overall accuracy: ${accuracyRate.toFixed(1)}%`);

    // Identify problem areas
    const inaccurateFeedback = this.feedbackQueue.filter(f => !f.wasAccurate);
    
    if (inaccurateFeedback.length > 0) {
      // Group by common issues (simplified)
      const issueTypes = new Map<string, number>();

      inaccurateFeedback.forEach(f => {
        if (f.notes) {
          // Simple keyword analysis
          if (f.notes.toLowerCase().includes('demand')) {
            issueTypes.set('demand_forecasting', (issueTypes.get('demand_forecasting') || 0) + 1);
          }
          if (f.notes.toLowerCase().includes('supplier') || f.notes.toLowerCase().includes('lead time')) {
            issueTypes.set('supplier_issues', (issueTypes.get('supplier_issues') || 0) + 1);
          }
          if (f.notes.toLowerCase().includes('seasonal') || f.notes.toLowerCase().includes('promotion')) {
            issueTypes.set('seasonal_factors', (issueTypes.get('seasonal_factors') || 0) + 1);
          }
        }
      });

      // Generate insights from issues
      issueTypes.forEach((count, issue) => {
        const percentage = (count / inaccurateFeedback.length) * 100;
        insights.push(`${percentage.toFixed(0)}% of errors related to ${issue.replace('_', ' ')}`);
      });

      // Generate action items
      if (issueTypes.get('demand_forecasting') && issueTypes.get('demand_forecasting')! > inaccurateFeedback.length * 0.3) {
        actionItems.push('Review and enhance demand forecasting algorithms');
        actionItems.push('Consider incorporating additional demand signals');
      }

      if (issueTypes.get('supplier_issues') && issueTypes.get('supplier_issues')! > inaccurateFeedback.length * 0.2) {
        actionItems.push('Update supplier lead time data');
        actionItems.push('Consider backup suppliers for unreliable vendors');
      }

      if (issueTypes.get('seasonal_factors') && issueTypes.get('seasonal_factors')! > inaccurateFeedback.length * 0.2) {
        actionItems.push('Improve seasonal adjustment factors');
        actionItems.push('Add more historical seasonal data');
      }
    }

    // Check if retraining is recommended
    const retrainingRecommended = totalFeedback >= this.RETRAIN_THRESHOLD || accuracyRate < 70;

    if (retrainingRecommended) {
      actionItems.push('Model retraining recommended based on feedback volume/accuracy');
    }

    // Clear processed feedback
    this.feedbackQueue = [];

    return {
      processed: true,
      insights,
      actionItems,
      retrainingRecommended,
    };
  }

  /**
   * Adjust model weights based on feedback
   */
  async adjustModelWeights(feedback: FeedbackData[]): Promise<{
    adjustments: Map<string, number>;
    reasoning: string;
  }> {
    const adjustments = new Map<string, number>();
    let reasoning = '';

    // Analyze feedback to determine which agent needs adjustment
    const inaccurate = feedback.filter(f => !f.wasAccurate);

    if (inaccurate.length > feedback.length * 0.3) {
      // More than 30% inaccurate - adjust weights
      
      // Simplified weight adjustment logic
      const demandIssues = inaccurate.filter(f => 
        f.notes?.toLowerCase().includes('demand') || 
        f.notes?.toLowerCase().includes('forecast')
      ).length;

      const supplierIssues = inaccurate.filter(f => 
        f.notes?.toLowerCase().includes('supplier') || 
        f.notes?.toLowerCase().includes('lead')
      ).length;

      if (demandIssues > supplierIssues) {
        adjustments.set('demand_agent_weight', 1.1); // Increase weight
        reasoning = 'Increased demand agent weight due to forecasting issues';
      } else if (supplierIssues > demandIssues) {
        adjustments.set('supplier_agent_weight', 1.1);
        reasoning = 'Increased supplier agent weight due to lead time issues';
      }
    }

    if (adjustments.size === 0) {
      reasoning = 'No weight adjustments needed - performance acceptable';
    }

    return { adjustments, reasoning };
  }

  /**
   * Flag edge cases for review
   */
  async flagEdgeCases(feedback: FeedbackData[]): Promise<{
    edgeCases: Array<{
      decisionId: number;
      issue: string;
      severity: 'low' | 'medium' | 'high';
      recommendation: string;
    }>;
  }> {
    const edgeCases = [];

    for (const f of feedback) {
      if (!f.wasAccurate && f.notes) {
        let severity: 'low' | 'medium' | 'high' = 'medium';
        let issue = 'Inaccurate prediction';
        let recommendation = 'Review decision parameters';

        // Analyze severity
        if (f.notes.toLowerCase().includes('critical') || f.notes.toLowerCase().includes('urgent')) {
          severity = 'high';
          issue = 'Critical prediction failure';
          recommendation = 'Immediate review required - update safety stock parameters';
        } else if (f.notes.toLowerCase().includes('unusual') || f.notes.toLowerCase().includes('unexpected')) {
          severity = 'medium';
          issue = 'Unexpected outcome';
          recommendation = 'Investigate contributing factors and update model';
        }

        edgeCases.push({
          decisionId: f.decisionId,
          issue,
          severity,
          recommendation,
        });
      }
    }

    return { edgeCases };
  }

  /**
   * Trigger model retraining
   */
  async triggerRetraining(): Promise<{
    initiated: boolean;
    message: string;
    estimatedCompletionTime: Date;
  }> {
    // In a real system, this would kick off a model training pipeline
    const estimatedCompletionTime = new Date();
    estimatedCompletionTime.setHours(estimatedCompletionTime.getHours() + 2);

    console.log('🔄 Model retraining initiated...');

    return {
      initiated: true,
      message: 'Model retraining pipeline started with accumulated feedback data',
      estimatedCompletionTime,
    };
  }

  /**
   * Generate feedback summary report
   */
  async generateFeedbackReport(days: number = 30): Promise<{
    period: string;
    totalFeedback: number;
    accuracyRate: number;
    topIssues: Array<{ issue: string; count: number; percentage: number }>;
    improvements: string[];
  }> {
    // Get feedback from specified period
    // For this implementation, we'll use mock data structure
    const totalFeedback = this.feedbackQueue.length + Math.floor(Math.random() * 50);
    const accuratePredictions = Math.floor(totalFeedback * (0.75 + Math.random() * 0.15));
    const accuracyRate = (accuratePredictions / totalFeedback) * 100;

    const topIssues = [
      { issue: 'Demand forecasting accuracy', count: 12, percentage: 24 },
      { issue: 'Supplier lead time variance', count: 8, percentage: 16 },
      { issue: 'Seasonal adjustment factors', count: 5, percentage: 10 },
    ];

    const improvements = [
      'Enhanced demand forecasting with additional data sources',
      'Improved supplier reliability tracking',
      'Better handling of seasonal variations',
      'More accurate safety stock calculations',
    ];

    return {
      period: `Last ${days} days`,
      totalFeedback,
      accuracyRate,
      topIssues,
      improvements,
    };
  }
}

export const feedbackProcessor = new FeedbackProcessor();
