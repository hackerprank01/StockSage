"""
Unit tests for the Demand Forecasting Agent.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from agents.demand_forecast_agent import DemandForecastAgent


def test_demand_forecast_with_valid_data():
    """Test demand forecasting with valid historical data."""
    agent = DemandForecastAgent()
    
    data = {
        'sales_history': [10, 12, 15, 13, 18, 14, 16, 12, 19, 15],
        'forecast_days': 7
    }
    
    result = agent.analyze(data)
    
    # Verify result structure
    assert 'forecast' in result
    assert 'average_demand' in result
    assert 'confidence' in result
    assert 'trend' in result
    
    # Verify forecast length
    assert len(result['forecast']) == 7
    
    # Verify all forecasts are non-negative
    assert all(f >= 0 for f in result['forecast'])
    
    # Verify confidence is between 0 and 1
    assert 0 <= result['confidence'] <= 1
    
    # Verify explanations exist
    explanations = agent.explain()
    assert len(explanations) > 0
    assert isinstance(explanations, list)
    
    print("✓ Demand forecast with valid data test passed")


def test_demand_forecast_insufficient_data():
    """Test demand forecasting with insufficient data."""
    agent = DemandForecastAgent()
    
    data = {
        'sales_history': [10, 12],
        'forecast_days': 5
    }
    
    result = agent.analyze(data)
    
    # Verify it handles insufficient data gracefully
    assert 'forecast' in result
    assert result['confidence'] == 0.0
    assert result['method'] == 'insufficient_data'
    
    print("✓ Demand forecast with insufficient data test passed")


def test_demand_forecast_empty_data():
    """Test demand forecasting with empty data."""
    agent = DemandForecastAgent()
    
    data = {
        'sales_history': [],
        'forecast_days': 5
    }
    
    result = agent.analyze(data)
    
    # Verify it handles empty data gracefully
    assert 'forecast' in result
    assert len(result['forecast']) == 5
    assert all(f == 0 for f in result['forecast'])
    
    print("✓ Demand forecast with empty data test passed")


if __name__ == '__main__':
    test_demand_forecast_with_valid_data()
    test_demand_forecast_insufficient_data()
    test_demand_forecast_empty_data()
    print("\n✅ All demand forecast tests passed!")
