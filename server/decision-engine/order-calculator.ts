/**
 * Order Calculator
 * Calculates optimal order quantities using Economic Order Quantity (EOQ) formula
 */

export interface OrderCalculation {
  economicOrderQuantity: number;
  adjustedOrderQuantity: number;
  totalCost: number;
  orderingCost: number;
  holdingCost: number;
  numberOfOrders: number;
  reasoning: string;
}

export class OrderCalculator {
  /**
   * Calculate Economic Order Quantity (EOQ)
   * EOQ = √((2 × annual_demand × order_cost) / holding_cost_per_unit)
   */
  calculateEOQ(
    annualDemand: number,
    orderCost: number,
    holdingCostPerUnit: number
  ): number {
    if (annualDemand <= 0 || orderCost <= 0 || holdingCostPerUnit <= 0) {
      return 0;
    }

    const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
    return Math.ceil(eoq);
  }

  /**
   * Calculate optimal order quantity with all constraints
   */
  calculateOptimalOrder(
    predictedMonthlyDemand: number,
    unitCost: number,
    minOrderQuantity: number = 1,
    budgetConstraint?: number,
    storageCapacity?: number,
    orderCostEstimate: number = 50 // Default ordering cost
  ): OrderCalculation {
    // Convert monthly to annual demand
    const annualDemand = predictedMonthlyDemand * 12;
    
    // Calculate holding cost (typically 20-30% of unit cost per year)
    const holdingCostPerUnit = unitCost * 0.25;
    
    // Calculate base EOQ
    let eoq = this.calculateEOQ(annualDemand, orderCostEstimate, holdingCostPerUnit);
    
    // Apply minimum order quantity constraint
    let adjustedQuantity = Math.max(eoq, minOrderQuantity);
    
    // Apply budget constraint if specified
    if (budgetConstraint && adjustedQuantity * unitCost > budgetConstraint) {
      adjustedQuantity = Math.floor(budgetConstraint / unitCost);
      adjustedQuantity = Math.max(adjustedQuantity, minOrderQuantity);
    }
    
    // Apply storage capacity constraint if specified
    if (storageCapacity && adjustedQuantity > storageCapacity) {
      adjustedQuantity = storageCapacity;
    }
    
    // Calculate number of orders per year
    const numberOfOrders = annualDemand / adjustedQuantity;
    
    // Calculate total annual ordering cost
    const totalOrderingCost = numberOfOrders * orderCostEstimate;
    
    // Calculate average inventory
    const averageInventory = adjustedQuantity / 2;
    
    // Calculate total annual holding cost
    const totalHoldingCost = averageInventory * holdingCostPerUnit;
    
    // Calculate total cost (ordering + holding)
    const totalCost = totalOrderingCost + totalHoldingCost;
    
    // Generate reasoning
    let reasoning = `EOQ calculation: ${eoq} units. `;
    
    if (adjustedQuantity !== eoq) {
      const reasons: string[] = [];
      if (adjustedQuantity === minOrderQuantity && minOrderQuantity > eoq) {
        reasons.push(`increased to meet minimum order quantity (${minOrderQuantity})`);
      }
      if (budgetConstraint && adjustedQuantity * unitCost >= budgetConstraint * 0.95) {
        reasons.push(`constrained by budget limit ($${budgetConstraint})`);
      }
      if (storageCapacity && adjustedQuantity === storageCapacity) {
        reasons.push(`limited by storage capacity (${storageCapacity} units)`);
      }
      reasoning += `Adjusted to ${adjustedQuantity} units (${reasons.join(', ')}). `;
    }
    
    reasoning += `This will result in approximately ${numberOfOrders.toFixed(1)} orders per year with total annual cost of $${totalCost.toFixed(2)}.`;
    
    return {
      economicOrderQuantity: eoq,
      adjustedOrderQuantity: adjustedQuantity,
      totalCost,
      orderingCost: totalOrderingCost,
      holdingCost: totalHoldingCost,
      numberOfOrders,
      reasoning,
    };
  }

  /**
   * Calculate bulk discount benefits
   */
  calculateBulkDiscount(
    baseQuantity: number,
    unitCost: number,
    discountTiers: Array<{ quantity: number; discountPercent: number }>
  ): {
    recommendedQuantity: number;
    originalCost: number;
    discountedCost: number;
    savings: number;
    appliedDiscount: number;
  } {
    const baseCost = baseQuantity * unitCost;
    let bestQuantity = baseQuantity;
    let bestCost = baseCost;
    let bestDiscount = 0;
    
    // Sort tiers by quantity
    const sortedTiers = [...discountTiers].sort((a, b) => a.quantity - b.quantity);
    
    // Check each tier
    for (const tier of sortedTiers) {
      if (tier.quantity >= baseQuantity) {
        const discountedPrice = unitCost * (1 - tier.discountPercent / 100);
        const cost = tier.quantity * discountedPrice;
        
        // Only recommend if the increased quantity is reasonable (< 50% increase)
        if (tier.quantity <= baseQuantity * 1.5 && cost < bestCost) {
          bestQuantity = tier.quantity;
          bestCost = cost;
          bestDiscount = tier.discountPercent;
        }
      }
    }
    
    return {
      recommendedQuantity: bestQuantity,
      originalCost: baseCost,
      discountedCost: bestCost,
      savings: baseCost - bestCost,
      appliedDiscount: bestDiscount,
    };
  }

  /**
   * Calculate total cost including shipping and taxes
   */
  calculateTotalOrderCost(
    quantity: number,
    unitCost: number,
    shippingCost: number = 0,
    taxRate: number = 0
  ): {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
  } {
    const subtotal = quantity * unitCost;
    const shipping = shippingCost;
    const tax = (subtotal + shipping) * taxRate;
    const total = subtotal + shipping + tax;
    
    return {
      subtotal,
      shipping,
      tax,
      total,
    };
  }
}

export const orderCalculator = new OrderCalculator();
