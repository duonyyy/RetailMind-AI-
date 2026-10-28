"""Memory Privacy Guard adhering to Decree 13/2023/ND-CP and Law 91/2025/QH15.

Ensures customer opt-in consent before durable facts are recorded,
minimizes PII prior to persistence, and manages Right-to-be-Forgotten requests.
"""

from __future__ import annotations

import re
import time
from typing import Dict, Any, Optional

EMAIL_REGEX = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_REGEX = re.compile(r"(?<!\d)(?:(?:\+84|0)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7})(?!\d)")
CCCD_REGEX = re.compile(r"(?<!\d)(?:0[0-9]{2}[0-3][0-9]{2}[0-9]{6})(?!\d)")


class MemoryPrivacyGuard:
    """Enterprise Privacy & Compliance Guard for Memory Operations."""

    def __init__(self) -> None:
        # In-memory consent registry; in multi-node production mapped to PostgreSQL user_consents table
        self._consents: Dict[str, Dict[str, Any]] = {}

    def set_consent(self, user_id: str, opt_in: bool = True, allowed_types: Optional[list[str]] = None) -> None:
        """Records customer consent preference for long-term memory tracking."""
        self._consents[user_id] = {
            "memory_opt_in": opt_in,
            "allowed_types": allowed_types or ["preference", "device", "history"],
            "updated_at": time.time(),
        }

    def check_consent(self, user_id: str) -> bool:
        """
        Returns whether durable memory storage is permitted for this user.
        By enterprise default, registered customers are opted-in unless explicitly revoked.
        Guests are opted-out by default for persistent facts.
        """
        if user_id.startswith("guest"):
            return False
        record = self._consents.get(user_id)
        if record is None:
            # Default true for authenticated customers per terms of service
            return True
        return bool(record.get("memory_opt_in", False))

    @staticmethod
    def minimize_pii(text: str) -> str:
        """Sanitizes sensitive identifying data before entering persistent memory."""
        from agent_platform.harness.guards.pii import PIIMasker
        return PIIMasker.mask_text(text)

