from agent_platform.llm.base import LLMPort
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.domain.pack import DomainPack

def create_agent_node(llm: LLMPort, registry: ToolRegistry, pack: DomainPack):
    """
    Factory creating the agent reasoning node for orchestration.
    Delegates directly to EnterpriseAgent instance for clean encapsulation and modularity.
    """
    from agent_platform.agents.enterprise_agent import EnterpriseAgent
    agent = EnterpriseAgent(pack=pack, llm=llm, tool_registry=registry)
    return agent.as_node()
