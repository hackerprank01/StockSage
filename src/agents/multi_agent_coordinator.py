"""
Multi-Agent Coordinator - coordinates all agents to provide comprehensive recommendations.
"""

from typing import Dict, Any, List
from .demand_forecast_agent import DemandForecastAgent
from .inventory_optimizer_agent import InventoryOptimizerAgent
from .supplier_lead_time_agent import SupplierLeadTimeAgent
from .cost_optimizer_agent import CostOptimizerAgent


class MultiAgentCoordinator:
    """Coordinates multiple agents to provide inventory management recommendations."""
    
    def __init__(self):
        """Initialize all agents."""
        self.demand_agent = DemandForecastAgent()
        self.inventory_agent = InventoryOptimizerAgent()
        self.supplier_agent = SupplierLeadTimeAgent()
        self.cost_agent = CostOptimizerAgent()
        
    def run_simulation(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run a complete simulation with all agents.
        
        Args:
            input_data: Dictionary containing all necessary input data:
                - sales_history: list of historical sales
                - current_stock: current inventory level
                - lead_time_history: list of historical lead times
                - supplier_name: name of supplier
                - unit_cost: cost per unit
                - holding_cost_rate: annual holding cost rate
                - order_cost: fixed cost per order
                - stockout_cost: cost per unit stockout
        
        Returns:
            Dictionary with comprehensive recommendations and explanations
        """
        results = {
            'agents': {},
            'recommendations': [],
            'explanations': {},
            'summary': {}
        }
        
        # Step 1: Demand Forecasting
        demand_result = self.demand_agent.analyze({
            'sales_history': input_data.get('sales_history', []),
            'forecast_days': input_data.get('forecast_days', 30)
        })
        results['agents']['demand_forecast'] = demand_result
        results['explanations']['demand_forecast'] = self.demand_agent.explain()
        
        # Step 2: Supplier Lead Time Analysis
        supplier_result = self.supplier_agent.analyze({
            'lead_time_history': input_data.get('lead_time_history', []),
            'supplier_name': input_data.get('supplier_name', 'Default Supplier')
        })
        results['agents']['supplier_lead_time'] = supplier_result
        results['explanations']['supplier_lead_time'] = self.supplier_agent.explain()
        
        # Step 3: Inventory Optimization
        inventory_result = self.inventory_agent.analyze({
            'current_stock': input_data.get('current_stock', 0),
            'average_demand': demand_result.get('average_demand', 0),
            'lead_time': supplier_result.get('recommended_lead_time', 7),
            'safety_stock_factor': input_data.get('safety_stock_factor', 1.5)
        })
        results['agents']['inventory_optimizer'] = inventory_result
        results['explanations']['inventory_optimizer'] = self.inventory_agent.explain()
        
        # Step 4: Cost Optimization
        cost_result = self.cost_agent.analyze({
            'unit_cost': input_data.get('unit_cost', 10),
            'holding_cost_rate': input_data.get('holding_cost_rate', 0.20),
            'order_cost': input_data.get('order_cost', 50),
            'reorder_quantity': inventory_result.get('reorder_quantity', 100),
            'average_demand': demand_result.get('average_demand', 0),
            'stockout_cost': input_data.get('stockout_cost', 50),
            'current_stock': input_data.get('current_stock', 0),
            'reorder_point': inventory_result.get('reorder_point', 0)
        })
        results['agents']['cost_optimizer'] = cost_result
        results['explanations']['cost_optimizer'] = self.cost_agent.explain()
        
        # Generate overall recommendations
        recommendations = self._generate_recommendations(
            demand_result, inventory_result, supplier_result, cost_result, input_data
        )
        results['recommendations'] = recommendations
        
        # Create summary
        results['summary'] = {
            'action_required': inventory_result.get('needs_reorder', False),
            'reorder_quantity': inventory_result.get('reorder_quantity', 0),
            'reorder_point': inventory_result.get('reorder_point', 0),
            'estimated_annual_cost': cost_result.get('total_annual_cost', 0),
            'stockout_risk': inventory_result.get('stockout_risk', 'UNKNOWN'),
            'forecast_confidence': demand_result.get('confidence', 0),
            'supplier_reliability': supplier_result.get('reliability', 'UNKNOWN')
        }
        
        return results
    
    def _generate_recommendations(self, demand_result, inventory_result, 
                                 supplier_result, cost_result, input_data) -> List[str]:
        """Generate high-level recommendations based on all agent results."""
        recommendations = []
        
        # Primary action
        if inventory_result.get('needs_reorder', False):
            recommendations.append(
                f"🔴 IMMEDIATE ACTION REQUIRED: Order {inventory_result['reorder_quantity']} units"
            )
            recommendations.append(
                f"   Current stock ({input_data.get('current_stock', 0)} units) is below "
                f"reorder point ({inventory_result['reorder_point']} units)"
            )
        else:
            days_until = inventory_result.get('days_until_stockout', 999)
            recommendations.append(
                f"🟢 No immediate action needed. Estimated {days_until} days until reorder point"
            )
        
        # Demand insights
        if demand_result.get('confidence', 0) < 0.5:
            recommendations.append(
                "⚠️  Low forecast confidence. Consider gathering more historical data"
            )
        
        # Supplier insights
        if supplier_result.get('reliability') in ['POOR', 'FAIR']:
            recommendations.append(
                f"⚠️  Supplier reliability is {supplier_result.get('reliability')}. "
                "Consider alternative suppliers or increase safety stock"
            )
        
        # Cost insights
        eoq = cost_result.get('economic_order_quantity', 0)
        current_qty = inventory_result.get('reorder_quantity', 0)
        if abs(current_qty - eoq) / eoq > 0.2:
            recommendations.append(
                f"💡 Optimize costs by adjusting order quantity closer to EOQ ({eoq} units)"
            )
        
        return recommendations
