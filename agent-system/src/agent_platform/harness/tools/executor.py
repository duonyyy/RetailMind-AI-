import asyncio
import inspect
import json
from typing import Dict, Any, Optional
from pydantic import ValidationError
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.spec import ToolContext, ToolUnavailableError
from agent_platform.harness.tools.idempotency import IdempotencyManager
from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness.governance.audit_ledger import TamperEvidentHashChainLedger
from agent_platform.harness.guards.pii import PIIMasker

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


def _contains_redaction_placeholder(value: Any) -> bool:
    """A redacted model argument cannot be used as authoritative business data."""
    placeholders = ("[REDACTED_PHONE]", "[REDACTED_CCCD]", "[REDACTED_EMAIL]",
                    "[REDACTED_SECRET]", "[REDACTED_TOKEN]", "[REDACTED_API_KEY]")
    if isinstance(value, str):
        return any(marker in value for marker in placeholders)
    if isinstance(value, dict):
        return any(_contains_redaction_placeholder(v) for v in value.values())
    if isinstance(value, (list, tuple)):
        return any(_contains_redaction_placeholder(v) for v in value)
    return False

class ToolExecutor:
    """
    Executes tools through strict 9-step governance and security pipeline:
    1. Registry scope check
    2. Pydantic typed validation (with sanitized error output)
    3. Server-side RBAC authorization
    4. Policy rules evaluation (Decimal-safe)
    5. HITL interrupt gating
    6. Idempotency replay check (sha256(thread_id + call_id))
    7. Timed async execution with timeout
    8. Tamper-evident hash chain audit logging (with truly masked inputs)
    9. Output sanitization & delimiter wrapping (with PII redaction)
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

        # An LLM sees placeholders only. Never execute them as real data.
        if _contains_redaction_placeholder(arguments):
            return ToolExecutionResult(
                output="Không thể sử dụng thông tin đã che để thực hiện yêu cầu. Vui lòng cung cấp thông tin qua kênh nhập liệu an toàn khi có hỗ trợ.",
                is_error=True,
                error_code="sensitive_input_unavailable",
            )

        # Step 2: Pydantic typed validation
        try:
            validated_args = tool_spec.input_model(**arguments)
        except ValidationError as ve:
            masked_errors = []
            for err in ve.errors():
                loc = err.get("loc", ())
                field = next((part for part in reversed(loc) if isinstance(part, str)), "input")
                masked_input = PIIMasker.mask({field: err.get("input")}, fail_closed=False)
                masked_errors.append({"type": err.get("type"), "loc": PIIMasker.mask(loc, fail_closed=False),
                                      "input": next(iter(masked_input.values()))})
            return ToolExecutionResult(
                output=f"Input validation error for tool '{tool_name}': {masked_errors}",
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
                input_masked={"arguments_keys": PIIMasker.mask(list(arguments.keys()), fail_closed=False)},
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
                        "arguments": PIIMasker.mask(args_dict, fail_closed=False),
                    },
                )

        # Step 6: Idempotency Key Gate
        idem_key = self.idempotency.generate_key(thread_id, call_id)
        if tool_spec.side_effect and self.idempotency.has(idem_key):
            cached_output = self.idempotency.get(idem_key)
            return ToolExecutionResult(output=cached_output, is_error=False)

        # Step 7: Timed Execution (Backend receives trusted, unmasked business data)
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
        except ToolUnavailableError as exc:
            return ToolExecutionResult(output=PIIMasker.mask(str(exc), fail_closed=False), is_error=True, error_code="unavailable")
        except asyncio.TimeoutError:
            return ToolExecutionResult(
                output=("Không thể xác nhận kết quả thao tác; hãy kiểm tra trạng thái trước khi thử lại."
                        if tool_spec.side_effect else f"Execution error: Tool '{tool_name}' timed out after {tool_spec.timeout_s}s."),
                is_error=True,
                error_code="timeout",
            )
        except Exception as exc:
            return ToolExecutionResult(
                output=f"Execution error in tool '{tool_name}': {PIIMasker.mask(str(exc), fail_closed=False)}",
                is_error=True,
                error_code="execution_failure",
            )

        # Step 8: Tamper-Evident Audit Logging (Inputs are verified masked)
        self.audit_ledger.record_event(
            event_id=f"audit_{call_id}",
            thread_id=thread_id,
            user_id=principal.user_id,
            role=principal.role,
            tenant_id=principal.tenant_id,
            tool_name=tool_name,
            input_masked=PIIMasker.mask(args_dict, fail_closed=False),
            decision="executed",
        )

        # Step 9: Output Sanitization & Escaping (Outputs are verified masked before reaching LLM / State)
        masked_output = PIIMasker.mask(raw_output, fail_closed=False)
        sanitized_str = json.dumps(masked_output, default=str, ensure_ascii=False) if isinstance(masked_output, (dict, list)) else PIIMasker.mask_text(str(masked_output))
        if len(sanitized_str) > 4000:
            sanitized_str = sanitized_str[:4000] + "... [truncated]"

        wrapped_output = f"<tool_output name=\"{tool_name}\">\n{sanitized_str}\n</tool_output>"

        if tool_spec.side_effect:
            self.idempotency.record(idem_key, wrapped_output)

        return ToolExecutionResult(output=wrapped_output, is_error=False)
