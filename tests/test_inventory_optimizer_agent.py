"""
Unit tests for the Inventory Optimizer Agent.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from agents.inventory_optimizer_agent import InventoryOptimizerAgent


def test_inventory_optimizer_basic():
    """Test basic inventory optimization."""
    agent = InventoryOptimizerAgent()
    
    data = {
        'current_stock': 50,
        'average_demand': 15,
        'lead_time': 7,
        'safety_stock_factor': 1.5
    }
    
    result = agent.analyze(data)
    
    # Verify result structure
    assert 'reorder_point' in result
    assert 'reorder_quantity' in result
    assert 'safety_stock' in result
    assert 'needs_reorder' in result
    assert 'stockout_risk' in result
    
    # Verify values are reasonable
    assert result['reorder_point'] > 0
    assert result['reorder_quantity'] > 0
    assert result['safety_stock'] >= 0
    
    # Verify explanations
    explanations = agent.explain()
    assert len(explanations) > 0
    
    print("✓ Inventory optimizer basic test passed")


def test_inventory_optimizer_low_stock():
    """Test inventory optimization when stock is low."""
    agent = InventoryOptimizerAgent()
    
    data = {
        'current_stock': 10,
        'average_demand': 15,
        'lead_time': 7,
        'safety_stock_factor': 1.5
    }
    
    result = agent.analyze(data)
    
    # Should flag that reorder is needed
    assert result['needs_reorder'] == True
    assert result['stockout_risk'] in ['HIGH', 'MEDIUM']
    
    print("✓ Inventory optimizer low stock test passed")


def test_inventory_optimizer_high_stock():
    """Test inventory optimization when stock is adequate."""
    agent = InventoryOptimizerAgent()
    
    data = {
        'current_stock': 500,
        'average_demand': 15,
        'lead_time': 7,
        'safety_stock_factor': 1.5
    }
    
    result = agent.analyze(data)
    
    # Should not flag reorder
    assert result['needs_reorder'] == False
    assert result['stockout_risk'] == 'LOW'
    
    print("✓ Inventory optimizer high stock test passed")


if __name__ == '__main__':
    test_inventory_optimizer_basic()
    test_inventory_optimizer_low_stock()
    test_inventory_optimizer_high_stock()
    print("\n✅ All inventory optimizer tests passed!")
