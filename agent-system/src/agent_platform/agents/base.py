from __future__ import annotations
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Dict, Any

if TYPE_CHECKING:
    from agent_platform.harness.state.contracts import AgentState

class BaseAgent(ABC):
    """
    Abstract Base Class for Enterprise Agents.
    Standardized according to the 'Agent = Model + Harness' pattern.
    Implements Python's __call__ protocol so any instance can be plugged
    directly into a LangGraph StateGraph as an autonomous node.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier or role name for the agent."""
        pass

    @abstractmethod
    async def process(self, state: AgentState) -> Dict[str, Any]:
        """
        Executes one reasoning turn for this agent given the current state.
        Returns state update dictionary.
        """
        pass

    async def __call__(self, state: AgentState) -> Dict[str, Any]:
        """Allows direct invocation as a LangGraph node."""
        return await self.process(state)

    def as_node(self):
        """Returns the callable node function for LangGraph builder registration."""
        return self.__call__
