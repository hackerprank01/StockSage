"""
Demand Forecasting Agent - predicts future demand using historical sales data.
"""

import numpy as np
from typing import Dict, Any, List
from .base_agent import BaseAgent


class DemandForecastAgent(BaseAgent):
    """Agent responsible for forecasting future demand."""
    
    def __init__(self):
        super().__init__("Demand Forecasting Agent")
        self.forecast = []
        self.confidence = 0.0
        
    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze historical sales data and forecast future demand.
        
        Args:
            data: Dictionary containing 'sales_history' (list of sales values)
                  and 'forecast_days' (number of days to forecast)
        
        Returns:
            Dictionary with forecasted demand and confidence level
        """
        sales_history = data.get('sales_history', [])
        forecast_days = data.get('forecast_days', 30)
        
        if not sales_history or len(sales_history) < 3:
            self.forecast = [0] * forecast_days
            self.confidence = 0.0
            self.explanations = ["Insufficient historical data for accurate forecasting"]
            return {
                'forecast': self.forecast,
                'confidence': self.confidence,
                'method': 'insufficient_data'
            }
        
        # Simple moving average with trend analysis
        sales_array = np.array(sales_history)
        
        # Calculate moving average
        window_size = min(7, len(sales_history))
        moving_avg = np.mean(sales_array[-window_size:])
        
        # Calculate trend (linear regression slope)
        if len(sales_history) >= 7:
            x = np.arange(len(sales_history))
            y = sales_array
            trend = np.polyfit(x, y, 1)[0]
        else:
            trend = 0
        
        # Generate forecast
        self.forecast = []
        for i in range(forecast_days):
            # Add some randomness to simulate real-world variation
            noise = np.random.normal(0, moving_avg * 0.1)
            forecasted_value = max(0, moving_avg + (trend * i) + noise)
            self.forecast.append(round(forecasted_value, 2))
        
        # Calculate confidence based on data quality
        variance = np.var(sales_array)
        mean = np.mean(sales_array)
        cv = (np.sqrt(variance) / mean) if mean > 0 else 1.0
        self.confidence = max(0, min(1, 1 - (cv / 2)))
        
        self.explanations = [
            f"Analyzed {len(sales_history)} days of historical sales data",
            f"Average daily demand: {moving_avg:.2f} units",
            f"Trend: {'increasing' if trend > 0 else 'decreasing' if trend < 0 else 'stable'} "
            f"({abs(trend):.2f} units/day)",
            f"Forecast confidence: {self.confidence * 100:.1f}%"
        ]
        
        return {
            'forecast': self.forecast,
            'average_demand': moving_avg,
            'trend': trend,
            'confidence': self.confidence,
            'method': 'moving_average_with_trend'
        }
    
    def explain(self) -> List[str]:
        """Return explanations for the forecast."""
        return self.explanations
