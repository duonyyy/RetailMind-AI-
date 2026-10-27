import hashlib
import json
import time
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class AuditEvent(BaseModel):
    event_id: str
    timestamp: float = Field(default_factory=time.time)
    thread_id: str
    user_id: str
    role: str
    tenant_id: str
    tool_name: str
    input_masked: Dict[str, Any]
    decision: str
    approver: Optional[str] = None
    prev_hash: str
    current_hash: str

class TamperEvidentHashChainLedger:
    """
    Append-only tamper-evident audit ledger using SHA-256 cryptographic chaining.
    """

    GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

    def __init__(self) -> None:
        self._events: List[AuditEvent] = []
        self._latest_hash = self.GENESIS_HASH

    @staticmethod
    def _compute_hash(prev_hash: str, payload: str) -> str:
        raw = f"{prev_hash}:{payload}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def record_event(
        self,
        event_id: str,
        thread_id: str,
        user_id: str,
        role: str,
        tenant_id: str,
        tool_name: str,
        input_masked: Dict[str, Any],
        decision: str,
        approver: Optional[str] = None,
    ) -> AuditEvent:
        """Appends an event to the cryptographically linked ledger."""
        payload_dict = {
            "event_id": event_id,
            "thread_id": thread_id,
            "user_id": user_id,
            "role": role,
            "tenant_id": tenant_id,
            "tool_name": tool_name,
            "input_masked": input_masked,
            "decision": decision,
            "approver": approver,
        }
        payload_str = json.dumps(payload_dict, sort_keys=True, default=str)
        current_hash = self._compute_hash(self._latest_hash, payload_str)

        event = AuditEvent(
            event_id=event_id,
            thread_id=thread_id,
            user_id=user_id,
            role=role,
            tenant_id=tenant_id,
            tool_name=tool_name,
            input_masked=input_masked,
            decision=decision,
            approver=approver,
            prev_hash=self._latest_hash,
            current_hash=current_hash,
        )

        self._events.append(event)
        self._latest_hash = current_hash
        return event

    def verify_integrity(self) -> bool:
        """Verifies that the hash chain is unbroken and free of tampering."""
        prev = self.GENESIS_HASH
        for ev in self._events:
            if ev.prev_hash != prev:
                return False
            payload_dict = {
                "event_id": ev.event_id,
                "thread_id": ev.thread_id,
                "user_id": ev.user_id,
                "role": ev.role,
                "tenant_id": ev.tenant_id,
                "tool_name": ev.tool_name,
                "input_masked": ev.input_masked,
                "decision": ev.decision,
                "approver": ev.approver,
            }
            payload_str = json.dumps(payload_dict, sort_keys=True, default=str)
            recalculated = self._compute_hash(prev, payload_str)
            if recalculated != ev.current_hash:
                return False
            prev = ev.current_hash
        return True

    def get_events(self) -> List[AuditEvent]:
        return list(self._events)
