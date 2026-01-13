"""
Supplier Lead Time Agent - analyzes and manages supplier lead times.
"""

import numpy as np
from typing import Dict, Any, List
from .base_agent import BaseAgent


class SupplierLeadTimeAgent(BaseAgent):
    """Agent responsible for analyzing supplier lead times."""
    
    def __init__(self):
        super().__init__("Supplier Lead Time Agent")
        self.recommended_lead_time = 0
        
    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze supplier lead time data and provide recommendations.
        
        Args:
            data: Dictionary containing:
                - 'lead_time_history': list of historical lead times
                - 'supplier_name': name of the supplier
        
        Returns:
            Dictionary with lead time statistics and recommendations
        """
        lead_time_history = data.get('lead_time_history', [])
        supplier_name = data.get('supplier_name', 'Unknown Supplier')
        
        if not lead_time_history:
            # Default lead time if no history
            self.recommended_lead_time = 7
            self.explanations = [
                f"No historical lead time data for {supplier_name}",
                "Using default lead time of 7 days"
            ]
            return {
                'recommended_lead_time': self.recommended_lead_time,
                'reliability': 'unknown'
            }
        
        lead_times = np.array(lead_time_history)
        
        # Calculate statistics
        avg_lead_time = np.mean(lead_times)
        max_lead_time = np.max(lead_times)
        std_lead_time = np.std(lead_times)
        
        # Recommended lead time includes buffer for variability
        self.recommended_lead_time = round(avg_lead_time + std_lead_time)
        
        # Assess supplier reliability
        cv = std_lead_time / avg_lead_time if avg_lead_time > 0 else 0
        if cv < 0.2:
            reliability = "EXCELLENT"
        elif cv < 0.4:
            reliability = "GOOD"
        elif cv < 0.6:
            reliability = "FAIR"
        else:
            reliability = "POOR"
        
        self.explanations = [
            f"Supplier: {supplier_name}",
            f"Average lead time: {avg_lead_time:.1f} days",
            f"Lead time variability: {std_lead_time:.1f} days",
            f"Maximum observed lead time: {max_lead_time} days",
            f"Recommended lead time (with buffer): {self.recommended_lead_time} days",
            f"Supplier reliability: {reliability}"
        ]
        
        return {
            'recommended_lead_time': self.recommended_lead_time,
            'average_lead_time': round(avg_lead_time, 1),
            'max_lead_time': int(max_lead_time),
            'variability': round(std_lead_time, 1),
            'reliability': reliability
        }
    
    def explain(self) -> List[str]:
        """Return explanations for lead time analysis."""
        return self.explanations
