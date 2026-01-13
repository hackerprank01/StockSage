"""
Run all tests for the StockSage system.
"""

import sys
import os

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Import test modules
import test_demand_forecast_agent
import test_inventory_optimizer_agent
import test_multi_agent_coordinator


def run_all_tests():
    """Run all test suites."""
    print("=" * 60)
    print("Running StockSage Test Suite")
    print("=" * 60)
    
    print("\n--- Testing Demand Forecast Agent ---")
    test_demand_forecast_agent.test_demand_forecast_with_valid_data()
    test_demand_forecast_agent.test_demand_forecast_insufficient_data()
    test_demand_forecast_agent.test_demand_forecast_empty_data()
    
    print("\n--- Testing Inventory Optimizer Agent ---")
    test_inventory_optimizer_agent.test_inventory_optimizer_basic()
    test_inventory_optimizer_agent.test_inventory_optimizer_low_stock()
    test_inventory_optimizer_agent.test_inventory_optimizer_high_stock()
    
    print("\n--- Testing Multi-Agent Coordinator ---")
    test_multi_agent_coordinator.test_coordinator_full_simulation()
    test_multi_agent_coordinator.test_coordinator_with_minimal_data()
    test_multi_agent_coordinator.test_coordinator_recommendations_format()
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)


if __name__ == '__main__':
    run_all_tests()
