import uuid
from typing import Optional, Dict, Any, AsyncIterator
from langgraph.checkpoint.memory import MemorySaver
from agent_platform.config.settings import PlatformSettings
from agent_platform.domain.pack import DomainPack
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.state.contracts import AgentState
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.tools.idempotency import IdempotencyManager
from agent_platform.harness.tools.builtin.search_knowledge import search_knowledge
from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness.governance.audit_ledger import TamperEvidentHashChainLedger
from agent_platform.harness.hitl.approval_store import ApprovalStore
from agent_platform.harness.persistence.memory.adapter import MemoryKVStore
from agent_platform.harness.persistence.sqlite.adapter import SqliteKVStore
from agent_platform.agents.orchestration import (
    build_orchestration_graph,
    OrchestratorRunner,
)
from agent_platform.llm.base import LLMPort
from agent_platform.llm.providers.scripted import ScriptedLLM
from agent_platform.llm.providers.mock import MockLLMClient
from agent_platform.llm.providers.openai_compat import OpenAICompatibleLLM
from agent_platform.llm.providers.gemini import GeminiLLM
from agent_platform.llm.resilient import ResilientLLMClient

class AgentHarness:
    """
    Central Controller for the 10-layer Enterprise Agent Platform.
    Adheres to: Agent = Model + Harness.
    """

    def __init__(self, settings: PlatformSettings, pack: DomainPack) -> None:
        self.settings = settings
        self.pack = pack

        # 1. Persistence Adapter
        if settings.persistence.adapter == "sqlite":
            self.kv_store = SqliteKVStore(settings.persistence.sqlite_path)
        else:
            self.kv_store = MemoryKVStore()

        # 2. Checkpointer
        self.checkpointer = MemorySaver()

        # 3. Governance: Policy & Audit
        policy_path = pack.pack_dir / pack.policies if pack.pack_dir else "policies.yaml"
        self.policy_engine = PolicyEngine.load_from_file(policy_path)
        self.audit_ledger = TamperEvidentHashChainLedger()

        # 4. Tools Platform
        self.tool_registry = ToolRegistry()
        self.tool_registry.register(search_knowledge)
        if pack.pack_dir and (pack.pack_dir / pack.tools.module).exists():
            self.tool_registry.load_from_module_file(pack.pack_dir / pack.tools.module)

        self.idempotency = IdempotencyManager()
        self.tool_executor = ToolExecutor(
            registry=self.tool_registry,
            policy_engine=self.policy_engine,
            audit_ledger=self.audit_ledger,
            idempotency_manager=self.idempotency,
        )

        # 5. HITL Store
        self.approval_store = ApprovalStore(self.kv_store)

        # 6. LLM Subsystem
        self.llm = self._create_llm_client()

        # 7. Orchestration Graph & Runner
        self.compiled_graph = build_orchestration_graph(
            pack=self.pack,
            llm=self.llm,
            registry=self.tool_registry,
            executor=self.tool_executor,
            checkpointer=self.checkpointer,
        )
        self.runner = OrchestratorRunner(self.compiled_graph)

    def _create_llm_client(self) -> LLMPort:
        provider = self.settings.llm.provider
        if provider == "scripted":
            client = ScriptedLLM(model_name=self.settings.llm.model_name)
            # Default answer for general test flow
            client.queue_answer("Dạ hệ thống đã nhận được câu hỏi và sẵn sàng hỗ trợ.")
            return client
        elif provider == "mock":
            return MockLLMClient(model_name=self.settings.llm.model_name)
        elif provider == "openai_compat":
            primary = OpenAICompatibleLLM(
                base_url=self.settings.llm.base_url or "https://api.openai.com/v1",
                api_key=self.settings.llm.api_key,
                model_name=self.settings.llm.model_name,
                timeout_seconds=self.settings.llm.timeout_seconds,
            )
            return ResilientLLMClient(primary_client=primary, fallback_client=MockLLMClient())
        elif provider == "gemini":
            primary = GeminiLLM(
                api_key=self.settings.llm.api_key,
                model_name=self.settings.llm.model_name,
                timeout_seconds=self.settings.llm.timeout_seconds,
            )
            return ResilientLLMClient(primary_client=primary, fallback_client=MockLLMClient())
        return MockLLMClient()

    async def execute(
        self,
        query: str,
        principal: Principal,
        thread_id: Optional[str] = None,
    ) -> AgentState:
        """Executes full agent reasoning cycle and returns completed state."""
        return await self.runner.execute(query=query, principal=principal, thread_id=thread_id)
