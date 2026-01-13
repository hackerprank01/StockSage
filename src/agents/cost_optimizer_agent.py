"""
Cost Optimizer Agent - analyzes costs and optimizes ordering decisions.
"""

from typing import Dict, Any, List
from .base_agent import BaseAgent


class CostOptimizerAgent(BaseAgent):
    """Agent responsible for cost optimization."""
    
    def __init__(self):
        super().__init__("Cost Optimizer Agent")
        self.total_cost = 0
        
    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze costs associated with inventory decisions.
        
        Args:
            data: Dictionary containing:
                - 'unit_cost': cost per unit
                - 'holding_cost_rate': annual holding cost as % of unit cost
                - 'order_cost': fixed cost per order
                - 'reorder_quantity': proposed order quantity
                - 'average_demand': average daily demand
                - 'stockout_cost': cost per stockout unit
                - 'current_stock': current inventory
                - 'reorder_point': calculated reorder point
        
        Returns:
            Dictionary with cost analysis and recommendations
        """
        unit_cost = data.get('unit_cost', 10)
        holding_cost_rate = data.get('holding_cost_rate', 0.20)
        order_cost = data.get('order_cost', 50)
        reorder_quantity = data.get('reorder_quantity', 100)
        average_demand = data.get('average_demand', 10)
        stockout_cost = data.get('stockout_cost', 50)
        current_stock = data.get('current_stock', 0)
        reorder_point = data.get('reorder_point', 50)
        
        # Calculate annual demand
        annual_demand = average_demand * 365
        
        # Calculate holding cost per unit per year
        holding_cost_per_unit = unit_cost * holding_cost_rate
        
        # Calculate total costs
        # 1. Ordering cost (how many orders per year)
        orders_per_year = annual_demand / reorder_quantity if reorder_quantity > 0 else 0
        annual_ordering_cost = orders_per_year * order_cost
        
        # 2. Holding cost (average inventory level)
        average_inventory = reorder_quantity / 2
        annual_holding_cost = average_inventory * holding_cost_per_unit
        
        # 3. Stockout risk cost
        stockout_risk = max(0, reorder_point - current_stock)
        estimated_stockout_cost = stockout_risk * stockout_cost * 0.1  # 10% probability
        
        # Total annual cost
        self.total_cost = annual_ordering_cost + annual_holding_cost + estimated_stockout_cost
        
        # Calculate Economic Order Quantity (EOQ) for comparison
        if holding_cost_per_unit > 0:
            eoq = ((2 * annual_demand * order_cost) / holding_cost_per_unit) ** 0.5
        else:
            eoq = reorder_quantity
        
        # Recommendations
        if abs(reorder_quantity - eoq) / eoq > 0.2:  # More than 20% difference
            cost_savings = abs(self.total_cost - (annual_ordering_cost + (eoq/2 * holding_cost_per_unit)))
            recommendation = f"Consider adjusting order quantity to {round(eoq)} units for optimal costs"
        else:
            recommendation = "Current order quantity is near optimal"
        
        self.explanations = [
            f"Unit cost: ${unit_cost:.2f}",
            f"Order cost: ${order_cost:.2f} per order",
            f"Annual holding cost rate: {holding_cost_rate*100:.0f}%",
            f"Expected orders per year: {orders_per_year:.1f}",
            f"Annual ordering cost: ${annual_ordering_cost:.2f}",
            f"Annual holding cost: ${annual_holding_cost:.2f}",
            f"Estimated stockout cost: ${estimated_stockout_cost:.2f}",
            f"Total annual cost: ${self.total_cost:.2f}",
            f"Economic Order Quantity (EOQ): {round(eoq)} units",
            recommendation
        ]
        
        return {
            'total_annual_cost': round(self.total_cost, 2),
            'ordering_cost': round(annual_ordering_cost, 2),
            'holding_cost': round(annual_holding_cost, 2),
            'stockout_cost': round(estimated_stockout_cost, 2),
            'economic_order_quantity': round(eoq),
            'recommendation': recommendation
        }
    
    def explain(self) -> List[str]:
        """Return explanations for cost optimization."""
        return self.explanations
