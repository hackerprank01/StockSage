"""
Base Agent class for StockSage multi-agent system.
All specialized agents inherit from this base class.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List


class BaseAgent(ABC):
    """Abstract base class for all agents in the system."""
    
    def __init__(self, name: str):
        """
        Initialize the base agent.
        
        Args:
            name: The name/identifier for this agent
        """
        self.name = name
        self.recommendations = []
        self.explanations = []
    
    @abstractmethod
    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze data and provide recommendations.
        
        Args:
            data: Input data for analysis
            
        Returns:
            Dictionary containing analysis results and recommendations
        """
        pass
    
    @abstractmethod
    def explain(self) -> List[str]:
        """
        Provide human-readable explanations for the agent's decisions.
        
        Returns:
            List of explanation strings
        """
        pass
    
    def get_name(self) -> str:
        """Return the agent's name."""
        return self.name
