import { getStructuredCompletion } from '../openai';
import { storage } from '../storage';

export interface SupplierRecommendation {
  recommendedSupplier: {
    id: number;
    name: string;
    email: string;
  };
  orderQuantity: number;
  expectedLeadTime: number;
  totalCost: number;
  unitCost: number;
  reasoning: string;
  alternatives: Array<{
    supplierId: number;
    supplierName: string;
    cost: number;
    leadTime: number;
    score: number;
  }>;
}

/**
 * Supplier Coordination Agent
 * Optimizes supplier selection and order quantities
 */
export class SupplierAgent {
  /**
   * Recommend best supplier and order quantity
   */
  async recommendOrder(
    productId: number,
    requiredQuantity: number,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<SupplierRecommendation> {
    const product = await storage.getProductById(productId);
    const suppliers = await storage.getSuppliers();
    
    if (suppliers.length === 0) {
      throw new Error('No active suppliers found');
    }

    // Get product's primary supplier
    let primarySupplier = suppliers.find(s => s.id === product.supplierId);
    if (!primarySupplier) {
      primarySupplier = suppliers[0]; // Fallback to first available
    }

    // Calculate costs and scores for each supplier
    const supplierAnalysis = suppliers.map(supplier => {
      const baseCost = product.unitCost * requiredQuantity;
      const leadTimeScore = this.calculateLeadTimeScore(supplier.leadTimeDays, urgency);
      const reliabilityScore = supplier.reliability;
      const quantityScore = requiredQuantity >= supplier.minOrderQuantity ? 1.0 : 0.5;
      
      // Weighted overall score
      const overallScore = (leadTimeScore * 0.4) + (reliabilityScore * 0.4) + (quantityScore * 0.2);
      
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        cost: baseCost,
        leadTime: supplier.leadTimeDays,
        reliability: supplier.reliability,
        minOrderQty: supplier.minOrderQuantity,
        score: overallScore,
      };
    }).sort((a, b) => b.score - a.score);

    // Prepare for AI analysis
    const systemPrompt = `You are a supplier coordination expert specializing in procurement optimization.
Analyze supplier options and recommend the best choice considering cost, lead time, reliability, and order quantities.
Use Economic Order Quantity (EOQ) principles and consider minimum order quantities and bulk discounts.`;

    const userPrompt = `Recommend the best supplier and order quantity for the following situation:

Product: ${product.name} (${product.sku})
Required Quantity: ${requiredQuantity} units
Urgency Level: ${urgency}
Product Unit Cost: $${product.unitCost}

Supplier Options:
${supplierAnalysis.map((s, i) => `
${i + 1}. ${s.supplierName} (ID: ${s.supplierId})
   - Lead Time: ${s.leadTime} days
   - Reliability: ${(s.reliability * 100).toFixed(1)}%
   - Min Order Quantity: ${s.minOrderQty} units
   - Estimated Cost: $${s.cost.toFixed(2)}
   - Overall Score: ${(s.score * 100).toFixed(1)}/100
`).join('\n')}

Primary Supplier: ${primarySupplier.name}

Considerations:
- ${urgency === 'high' ? 'URGENT: Fast delivery is critical' : urgency === 'medium' ? 'Moderate urgency: Balance speed and cost' : 'Low urgency: Cost optimization is priority'}
- Prefer suppliers with high reliability
- Consider minimum order quantities
- Account for lead time variability

Provide a JSON response with:
{
  "recommendedSupplier": {
    "id": <supplier id>,
    "name": "<supplier name>",
    "email": "<supplier email>"
  },
  "orderQuantity": <recommended quantity to order>,
  "expectedLeadTime": <days>,
  "totalCost": <total order cost>,
  "unitCost": <cost per unit>,
  "reasoning": "<detailed explanation>",
  "alternatives": [
    {
      "supplierId": <id>,
      "supplierName": "<name>",
      "cost": <cost>,
      "leadTime": <days>,
      "score": <0-1>
    }
  ]
}`;

    try {
      const result = await getStructuredCompletion<SupplierRecommendation>(
        systemPrompt,
        userPrompt
      );

      // Validate and enrich with supplier details
      const recommendedSupplier = suppliers.find(s => s.id === result.recommendedSupplier.id);
      if (recommendedSupplier) {
        result.recommendedSupplier.email = recommendedSupplier.email;
        result.recommendedSupplier.name = recommendedSupplier.name;
      }

      // Ensure quantity meets minimum
      const supplier = suppliers.find(s => s.id === result.recommendedSupplier.id);
      if (supplier && result.orderQuantity < supplier.minOrderQuantity) {
        result.orderQuantity = supplier.minOrderQuantity;
        result.totalCost = result.unitCost * result.orderQuantity;
      }

      return result;
    } catch (error) {
      console.error('Supplier recommendation error:', error);
      
      // Fallback to best scoring supplier
      const bestSupplier = supplierAnalysis[0];
      const supplier = suppliers.find(s => s.id === bestSupplier.supplierId)!;
      const orderQty = Math.max(requiredQuantity, supplier.minOrderQuantity);
      
      return {
        recommendedSupplier: {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
        },
        orderQuantity: orderQty,
        expectedLeadTime: supplier.leadTimeDays,
        totalCost: product.unitCost * orderQty,
        unitCost: product.unitCost,
        reasoning: `Fallback recommendation: Selected ${supplier.name} based on highest overall score (${(bestSupplier.score * 100).toFixed(1)}/100). Order quantity adjusted to meet minimum order quantity of ${supplier.minOrderQuantity} units.`,
        alternatives: supplierAnalysis.slice(1, 3).map(s => ({
          supplierId: s.supplierId,
          supplierName: s.supplierName,
          cost: s.cost,
          leadTime: s.leadTime,
          score: s.score,
        })),
      };
    }
  }

  /**
   * Calculate lead time score based on urgency
   */
  private calculateLeadTimeScore(leadTimeDays: number, urgency: string): number {
    const maxAcceptableLeadTime = urgency === 'high' ? 3 : urgency === 'medium' ? 7 : 14;
    
    if (leadTimeDays <= maxAcceptableLeadTime) {
      return 1.0 - (leadTimeDays / maxAcceptableLeadTime) * 0.5;
    } else {
      return Math.max(0.1, 0.5 - ((leadTimeDays - maxAcceptableLeadTime) / maxAcceptableLeadTime) * 0.5);
    }
  }

  /**
   * Calculate Economic Order Quantity
   */
  calculateEOQ(
    annualDemand: number,
    orderingCost: number,
    holdingCostPerUnit: number
  ): number {
    if (holdingCostPerUnit <= 0 || orderingCost <= 0) return 0;
    return Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit));
  }

  /**
   * Evaluate supplier performance
   */
  async evaluateSupplierPerformance(supplierId: number): Promise<{
    onTimeDeliveryRate: number;
    averageLeadTime: number;
    orderCount: number;
  }> {
    // Get all purchase orders from this supplier
    const allPOs = await storage.getPurchaseOrders(1000);
    const supplierPOs = allPOs.filter(po => po.supplierId === supplierId && po.status === 'received');
    
    if (supplierPOs.length === 0) {
      return {
        onTimeDeliveryRate: 0.95, // Default
        averageLeadTime: 7,
        orderCount: 0,
      };
    }

    // Calculate metrics (simplified - would need actual delivery dates)
    const avgLeadTime = supplierPOs.reduce((sum, po) => {
      if (po.expectedDeliveryDate && po.orderDate) {
        const days = Math.floor((po.expectedDeliveryDate.getTime() - po.orderDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }
      return sum + 7; // Default
    }, 0) / supplierPOs.length;

    return {
      onTimeDeliveryRate: 0.95, // Simplified
      averageLeadTime: Math.round(avgLeadTime),
      orderCount: supplierPOs.length,
    };
  }
}

export const supplierAgent = new SupplierAgent();
