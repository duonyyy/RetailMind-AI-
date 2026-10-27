import asyncio
import inspect
import json
from typing import Dict, Any, Optional
from pydantic import ValidationError
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.spec import ToolContext
from agent_platform.harness.tools.idempotency import IdempotencyManager
from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness.governance.audit_ledger import TamperEvidentHashChainLedger

class ToolExecutionResult:
    def __init__(
        self,
        output: Any = None,
        is_error: bool = False,
        error_code: Optional[str] = None,
        requires_approval: bool = False,
        approval_metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.output = output
        self.is_error = is_error
        self.error_code = error_code
        self.requires_approval = requires_approval
        self.approval_metadata = approval_metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "output": self.output,
            "is_error": self.is_error,
            "error_code": self.error_code,
            "requires_approval": self.requires_approval,
            "approval_metadata": self.approval_metadata,
        }

class ToolExecutor:
    """
    Executes tools through strict 9-step governance and security pipeline:
    1. Registry scope check
    2. Pydantic typed validation
    3. Server-side RBAC authorization
    4. Policy rules evaluation (Decimal-safe)
    5. HITL interrupt gating
    6. Idempotency replay check (sha256(thread_id + call_id))
    7. Timed async execution with timeout
    8. Tamper-evident hash chain audit logging
    9. Output sanitization & delimiter wrapping
    """

    def __init__(
        self,
        registry: ToolRegistry,
        policy_engine: PolicyEngine,
        audit_ledger: Optional[TamperEvidentHashChainLedger] = None,
        idempotency_manager: Optional[IdempotencyManager] = None,
        http_client: Any = None,
    ) -> None:
        self.registry = registry
        self.policy_engine = policy_engine
        self.audit_ledger = audit_ledger or TamperEvidentHashChainLedger()
        self.idempotency = idempotency_manager or IdempotencyManager()
        self.http_client = http_client

    async def execute(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        principal: Principal,
        thread_id: str = "default_thread",
        call_id: str = "default_call",
        run_id: str = "default_run",
    ) -> ToolExecutionResult:
        # Step 1: Tra registry
        tool_spec = self.registry.get(tool_name)
        if not tool_spec:
            return ToolExecutionResult(
                output=f"Error: Tool '{tool_name}' not found or not enabled in domain pack.",
                is_error=True,
                error_code="tool_not_found",
            )

        # Step 2: Pydantic typed validation
        try:
            validated_args = tool_spec.input_model(**arguments)
        except ValidationError as ve:
            return ToolExecutionResult(
                output=f"Input validation error for tool '{tool_name}': {ve.errors()}",
                is_error=True,
                error_code="validation_error",
            )

        # Step 3: RBAC Authorization
        is_role_allowed = (
            "*" in tool_spec.allowed_roles or
            principal.role in tool_spec.allowed_roles or
            self.policy_engine.check_rbac(principal.role, tool_name)
        )
        if not is_role_allowed:
            self.audit_ledger.record_event(
                event_id=f"audit_{call_id}",
                thread_id=thread_id,
                user_id=principal.user_id,
                role=principal.role,
                tenant_id=principal.tenant_id,
                tool_name=tool_name,
                input_masked={"arguments_keys": list(arguments.keys())},
                decision="forbidden",
            )
            return ToolExecutionResult(
                output=f"Security error: Role '{principal.role}' is not authorized to execute '{tool_name}'.",
                is_error=True,
                error_code="forbidden",
            )

        # Step 4: Policy rule evaluation
        args_dict = validated_args.model_dump()
        if tool_spec.approval_rule:
            decision = self.policy_engine.evaluate_approval_rule(tool_spec.approval_rule, args_dict)
            if decision.action == "deny":
                return ToolExecutionResult(
                    output=f"Policy error: Action denied by governance policy: {decision.reason}",
                    is_error=True,
                    error_code="policy_denied",
                )

            # Step 5: HITL Gate
            if decision.action == "require_approval":
                return ToolExecutionResult(
                    output=f"Tool '{tool_name}' requires human approval before execution.",
                    requires_approval=True,
                    approval_metadata={
                        "rule": tool_spec.approval_rule,
                        "approver_role": decision.approver_role,
                        "timeout_hours": decision.timeout_hours,
                        "arguments": args_dict,
                    },
                )

        # Step 6: Idempotency Key Gate
        idem_key = self.idempotency.generate_key(thread_id, call_id)
        if tool_spec.side_effect and self.idempotency.has(idem_key):
            cached_output = self.idempotency.get(idem_key)
            return ToolExecutionResult(output=cached_output, is_error=False)

        # Step 7: Timed Execution
        ctx = ToolContext(
            principal=principal,
            idempotency_key=idem_key,
            thread_id=thread_id,
            run_id=run_id,
            http_client=self.http_client,
        )

        try:
            fn = tool_spec.func
            if inspect.iscoroutinefunction(fn):
                exec_coro = fn(validated_args, ctx)
            else:
                exec_coro = asyncio.to_thread(fn, validated_args, ctx)

            raw_output = await asyncio.wait_for(exec_coro, timeout=tool_spec.timeout_s)
        except asyncio.TimeoutError:
            return ToolExecutionResult(
                output=f"Execution error: Tool '{tool_name}' timed out after {tool_spec.timeout_s}s.",
                is_error=True,
                error_code="timeout",
            )
        except Exception as exc:
            return ToolExecutionResult(
                output=f"Execution error in tool '{tool_name}': {str(exc)}",
                is_error=True,
                error_code="execution_failure",
            )

        # Step 8: Tamper-Evident Audit Logging
        self.audit_ledger.record_event(
            event_id=f"audit_{call_id}",
            thread_id=thread_id,
            user_id=principal.user_id,
            role=principal.role,
            tenant_id=principal.tenant_id,
            tool_name=tool_name,
            input_masked=args_dict,
            decision="executed",
        )

        # Step 9: Output Sanitization & Escaping
        sanitized_str = json.dumps(raw_output, default=str, ensure_ascii=False) if isinstance(raw_output, (dict, list)) else str(raw_output)
        if len(sanitized_str) > 4000:
            sanitized_str = sanitized_str[:4000] + "... [truncated]"

        wrapped_output = f"<tool_output name=\"{tool_name}\">\n{sanitized_str}\n</tool_output>"

        if tool_spec.side_effect:
            self.idempotency.record(idem_key, wrapped_output)

        return ToolExecutionResult(output=wrapped_output, is_error=False)
