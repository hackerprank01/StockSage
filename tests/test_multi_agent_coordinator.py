"""
Unit tests for the Multi-Agent Coordinator.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from agents.multi_agent_coordinator import MultiAgentCoordinator


def test_coordinator_full_simulation():
    """Test full simulation with all agents."""
    coordinator = MultiAgentCoordinator()
    
    input_data = {
        'sales_history': [12, 15, 13, 18, 14, 16, 12, 19, 15, 17, 14, 20],
        'current_stock': 45,
        'lead_time_history': [7, 8, 6, 7, 9, 7],
        'supplier_name': 'Test Supplier',
        'unit_cost': 25.00,
        'holding_cost_rate': 0.20,
        'order_cost': 100.00,
        'stockout_cost': 75.00,
        'forecast_days': 30
    }
    
    results = coordinator.run_simulation(input_data)
    
    # Verify all agents produced results
    assert 'agents' in results
    assert 'demand_forecast' in results['agents']
    assert 'inventory_optimizer' in results['agents']
    assert 'supplier_lead_time' in results['agents']
    assert 'cost_optimizer' in results['agents']
    
    # Verify explanations exist for all agents
    assert 'explanations' in results
    assert 'demand_forecast' in results['explanations']
    assert 'inventory_optimizer' in results['explanations']
    assert 'supplier_lead_time' in results['explanations']
    assert 'cost_optimizer' in results['explanations']
    
    # Verify recommendations exist
    assert 'recommendations' in results
    assert len(results['recommendations']) > 0
    
    # Verify summary exists
    assert 'summary' in results
    assert 'action_required' in results['summary']
    assert 'reorder_quantity' in results['summary']
    assert 'estimated_annual_cost' in results['summary']
    
    print("✓ Coordinator full simulation test passed")


def test_coordinator_with_minimal_data():
    """Test coordinator with minimal input data."""
    coordinator = MultiAgentCoordinator()
    
    input_data = {
        'sales_history': [10, 12, 15],
        'current_stock': 20
    }
    
    # Should handle minimal data gracefully
    results = coordinator.run_simulation(input_data)
    
    # Should still produce results
    assert 'agents' in results
    assert 'recommendations' in results
    assert 'summary' in results
    
    print("✓ Coordinator minimal data test passed")


def test_coordinator_recommendations_format():
    """Test that recommendations are properly formatted."""
    coordinator = MultiAgentCoordinator()
    
    input_data = {
        'sales_history': [15, 16, 14, 18, 15, 17, 16, 15],
        'current_stock': 30,
        'lead_time_history': [7, 7, 8],
        'supplier_name': 'Test Supplier',
        'unit_cost': 20.00,
        'order_cost': 50.00
    }
    
    results = coordinator.run_simulation(input_data)
    
    # Verify recommendations are strings
    assert all(isinstance(rec, str) for rec in results['recommendations'])
    
    # Verify at least one recommendation contains action guidance
    has_action = any('ACTION' in rec.upper() or '🔴' in rec or '🟢' in rec 
                     for rec in results['recommendations'])
    assert has_action
    
    print("✓ Coordinator recommendations format test passed")


if __name__ == '__main__':
    test_coordinator_full_simulation()
    test_coordinator_with_minimal_data()
    test_coordinator_recommendations_format()
    print("\n✅ All coordinator tests passed!")
