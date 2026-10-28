import uuid
from typing import Optional, Dict, Any, AsyncIterator, Literal
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
from agent_platform.harness.hitl.approval_store import ApprovalStore, ApprovalRequest
from agent_platform.harness.observability.finops import FinOpsLedger
from agent_platform.harness.memory import EnterpriseMemoryManager
from agent_platform.harness.persistence.memory.adapter import MemoryKVStore
from agent_platform.harness.persistence.sqlite.adapter import SqliteKVStore
from agent_platform.harness.persistence.postgres.adapter import PostgresKVStore
from agent_platform.harness.persistence.redis.adapter import RedisKVStore
from agent_platform.harness.persistence.checkpointer import create_checkpointer
from agent_platform.agents.workflow import (
    build_orchestration_graph,
    OrchestratorRunner,
)
from agent_platform.llm.base import LLMPort, Usage
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

        # 1. Persistence Adapter (memory | sqlite | postgres | redis)
        adapter_type = settings.persistence.adapter
        if adapter_type == "sqlite":
            self.kv_store = SqliteKVStore(settings.persistence.sqlite_path)
        elif adapter_type == "postgres":
            self.kv_store = PostgresKVStore(settings.persistence.postgres_url)
        elif adapter_type == "redis":
            self.kv_store = RedisKVStore(settings.persistence.redis_url)
        else:
            self.kv_store = MemoryKVStore()

        # 2. Checkpointer (Enterprise Multi-Adapter Persistent Checkpointer)
        self.checkpointer = create_checkpointer(self.settings)

        # 3. Governance: Policy, Audit & FinOps Ledger
        policy_path = pack.pack_dir / pack.policies if pack.pack_dir else "policies.yaml"
        self.policy_engine = PolicyEngine.load_from_file(policy_path)
        self.audit_ledger = TamperEvidentHashChainLedger()
        self.finops_ledger = FinOpsLedger()

        # 3b. Enterprise Multi-Tier Memory Engine (VinAI Track 3 architecture)
        self.memory = EnterpriseMemoryManager(
            short_term_capacity=pack.limits.max_steps,
            total_context_tokens=pack.limits.context_token_budget,
        )

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
        """Executes full agent reasoning cycle, records FinOps telemetry, updates memory, and returns completed state."""
        session_key = thread_id or f"thread_{uuid.uuid4().hex[:12]}"
        user_id = principal.user_id if principal else None
        context_tuple = self.memory.retrieve_merged_context(
            user_id=user_id or "",
            session_id=session_key,
            query=query,
        )
        mem_ctx = context_tuple[0] if isinstance(context_tuple, tuple) else context_tuple

        state = await self.runner.execute(
            query=query,
            principal=principal,
            thread_id=session_key,
            memory_context=mem_ctx if mem_ctx else None,
        )

        # Update Tier 1 working memory turns
        self.memory.add_working_turn(session_key, "user", query)
        if ans_text := state.get("final_answer"):
            self.memory.add_working_turn(session_key, "assistant", ans_text)

        # Record FinOps usage in Decimal ledger
        ans_text = state.get("final_answer") or ""
        prompt_toks = max(12, len(query.split()) * 4)
        comp_toks = max(8, len(ans_text.split()) * 3)
        usage = Usage(
            prompt_tokens=prompt_toks,
            completion_tokens=comp_toks,
            total_tokens=prompt_toks + comp_toks,
        )
        self.finops_ledger.record_usage(
            thread_id=state.get("thread_id", thread_id or "default_thread"),
            run_id=state.get("run_id", "default_run"),
            model=self.settings.llm.model_name or "default",
            provider=self.settings.llm.provider,
            usage=usage,
        )
        return state

    async def resolve_and_resume_hitl(
        self,
        approval_id: str,
        decision: Literal["approved", "rejected"],
        approver_user_id: str,
        note: str = "",
    ) -> Dict[str, Any]:
        """Reject safely; approval stays pending until requester-bound execution exists."""
        # The existing approval record does not bind the original authenticated
        # requester, and direct invocation below would bypass executor/ownership checks.
        # Leave the request pending until a safe resume contract exists.
        if decision == "approved":
            raise PermissionError("Approval execution is disabled until requester ownership can be verified.")
        resolved: ApprovalRequest = await self.approval_store.resolve(
            approval_id=approval_id,
            decision=decision,
            approver_user_id=approver_user_id,
            note=note,
        )

        self.audit_ledger.record_event(
            event_id=f"audit_hitl_{approval_id}",
            thread_id=resolved.thread_id,
            user_id=approver_user_id,
            role="admin",
            tenant_id=self.pack.name,
            tool_name=resolved.tool_name,
            input_masked={"approval_id": approval_id, "decision": decision, "note": note},
            decision=f"hitl_{decision}",
        )

        return {
            "approval": resolved,
            "resumed_output": None,
        }
