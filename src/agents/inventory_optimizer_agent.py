"""
Inventory Optimizer Agent - calculates optimal reorder points and quantities.
"""

import numpy as np
from typing import Dict, Any, List
from .base_agent import BaseAgent


class InventoryOptimizerAgent(BaseAgent):
    """Agent responsible for optimizing inventory levels."""
    
    def __init__(self):
        super().__init__("Inventory Optimizer Agent")
        self.reorder_point = 0
        self.reorder_quantity = 0
        
    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate optimal reorder point and quantity.
        
        Args:
            data: Dictionary containing:
                - 'current_stock': current inventory level
                - 'average_demand': average daily demand
                - 'lead_time': supplier lead time in days
                - 'safety_stock_factor': multiplier for safety stock (default 1.5)
        
        Returns:
            Dictionary with reorder point, reorder quantity, and recommendations
        """
        current_stock = data.get('current_stock', 0)
        average_demand = data.get('average_demand', 0)
        lead_time = data.get('lead_time', 7)
        safety_stock_factor = data.get('safety_stock_factor', 1.5)
        
        # Calculate safety stock (buffer to prevent stockouts)
        safety_stock = average_demand * lead_time * (safety_stock_factor - 1)
        
        # Calculate reorder point (when to order)
        self.reorder_point = (average_demand * lead_time) + safety_stock
        
        # Calculate Economic Order Quantity (EOQ) simplified version
        # Assuming 30-day review period
        review_period = 30
        self.reorder_quantity = average_demand * (lead_time + review_period)
        
        # Round to nearest whole number
        self.reorder_point = round(self.reorder_point)
        self.reorder_quantity = round(self.reorder_quantity)
        
        # Determine if reorder is needed
        needs_reorder = current_stock <= self.reorder_point
        stockout_risk = "HIGH" if current_stock < safety_stock else "MEDIUM" if current_stock < self.reorder_point else "LOW"
        
        self.explanations = [
            f"Current inventory: {current_stock} units",
            f"Average daily demand: {average_demand:.2f} units",
            f"Supplier lead time: {lead_time} days",
            f"Safety stock level: {safety_stock:.0f} units (buffer against uncertainty)",
            f"Reorder point: {self.reorder_point} units",
            f"Recommended reorder quantity: {self.reorder_quantity} units",
            f"Stockout risk: {stockout_risk}",
            f"Action: {'ORDER NOW' if needs_reorder else 'No immediate action needed'}"
        ]
        
        return {
            'reorder_point': self.reorder_point,
            'reorder_quantity': self.reorder_quantity,
            'safety_stock': round(safety_stock),
            'needs_reorder': needs_reorder,
            'stockout_risk': stockout_risk,
            'days_until_stockout': round(current_stock / average_demand) if average_demand > 0 else 999
        }
    
    def explain(self) -> List[str]:
        """Return explanations for inventory optimization."""
        return self.explanations
