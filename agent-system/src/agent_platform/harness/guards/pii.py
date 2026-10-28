"""PII Masking and Redaction Engine.

Adheres strictly to:
- Vietnamese Personal Data Protection Law (Law 91/2025/QH15)
- Decree 13/2023/ND-CP on Personal Data Protection
- RetailMind AI Engineering Constitution (AGENTS.md Section 5.3)

Standard Placeholders:
- CCCD: [REDACTED_CCCD]
- Vietnamese Phone: [REDACTED_PHONE]
- Email: [REDACTED_EMAIL]
"""

from __future__ import annotations

import copy
from decimal import Decimal
import logging
import re
import unicodedata
from typing import Any, Dict, List, Optional, Pattern, Set, Union

logger = logging.getLogger("agent_platform.guards.pii")

ZERO_WIDTH_REGEX: Pattern = re.compile(
    r"[\u200b-\u200f\ufeff\u202a-\u202e\u2060-\u206f\u00ad]"
)


def sanitize_invisible_characters(text: str) -> str:
    """Loại bỏ ký tự tàng hình và chuẩn hóa Unicode NFKC."""
    if not text:
        return text
    # 1. Loại bỏ các ký tự zero-width, soft hyphens, direction overrides
    cleaned = ZERO_WIDTH_REGEX.sub("", text)
    # 2. Chuẩn hóa về dạng tương đương dựng sẵn (Normalization Form KC)
    return unicodedata.normalize("NFKC", cleaned)


class PIIRedactionError(RuntimeError):
    """Raised when PII redaction fails in a fail-closed boundary."""
    pass


class PIIMasker:
    """Production PII Masker & Redactor for RetailMind AI.

    Protects sensitive identifying information across:
    - Provider boundaries (LLM complete/stream, Embeddings, Reranker, Judges)
    - Tool execution inputs/outputs and Pydantic validation errors
    - Audit ledgers and HITL arguments/notes
    - System logging and exception payloads
    """

    PLACEHOLDER_CCCD = "[REDACTED_CCCD]"
    PLACEHOLDER_PHONE = "[REDACTED_PHONE]"
    PLACEHOLDER_EMAIL = "[REDACTED_EMAIL]"
    PLACEHOLDER_SECRET = "[REDACTED_SECRET]"
    PLACEHOLDER_TOKEN = "[REDACTED_TOKEN]"
    PLACEHOLDER_API_KEY = "[REDACTED_API_KEY]"

    # Sensitive key names in dictionaries / headers to redact immediately
    SECRET_KEYS: Set[str] = {
        "authorization",
        "x-internal-secret",
        "x-api-key",
        "api_key",
        "apikey",
        "secret",
        "internal_secret",
        "access_token",
        "password",
        "token",
        "auth_token",
    }
    # Numeric identifiers need an explicit field context; treating every number
    # as PII would corrupt prices, quantities and order identifiers.
    PII_FIELD_KEYS = {
        "phone": PLACEHOLDER_PHONE, "phone_number": PLACEHOLDER_PHONE,
        "contact_phone": PLACEHOLDER_PHONE, "mobile": PLACEHOLDER_PHONE,
        "telephone": PLACEHOLDER_PHONE, "sdt": PLACEHOLDER_PHONE,
        "cccd": PLACEHOLDER_CCCD, "cccd_number": PLACEHOLDER_CCCD,
        "citizen_id": PLACEHOLDER_CCCD, "identity_number": PLACEHOLDER_CCCD,
        "customer_ssn": PLACEHOLDER_CCCD,
    }

    # 1. CCCD: 12 continuous digits or 3-3-3-3 with spaces/dots/dashes
    CCCD_REGEX: Pattern = re.compile(
        r"(?<!\d)(?:\d{12}|\d{3}[\s.-]\d{3}[\s.-]\d{3}[\s.-]\d{3})(?!\d)"
    )

    # 2. Vietnamese Phone: 10/11 digits starting with 0 or +84 / (+84) / 84
    # Covers mobile prefixes (03, 05, 07, 08, 09) and landlines (02x)
    # Allows spaces, dots, dashes between digit groups
    PHONE_REGEX: Pattern = re.compile(
        r"(?<!\d)(?:(?:\(?\+84\)?|\b84)\s*[-.]?\s*0?(?:[35789]\d|2\d{2})|0(?:[35789]\d|2\d{2}))(?:\s*[-.]?\s*\d){7}(?!\d)"
    )

    # 3. Email: RFC-compliant email formats with uppercase, lowercase, tags (+)
    EMAIL_REGEX: Pattern = re.compile(
        r"(?i)\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b"
    )

    # 4. Secrets & Bearer tokens in text
    BEARER_REGEX: Pattern = re.compile(r"(?i)\bBearer\s+[A-Za-z0-9\-._~+/]+=*")
    API_KEY_REGEX: Pattern = re.compile(r"(?i)\bsk-[A-Za-z0-9]{16,}\b")
    QUERY_SECRET_REGEX: Pattern = re.compile(r"(?i)([?&](?:key|api_key|apikey|access_token|token)=)[^&#\s]+")

    PATTERNS: Dict[str, Pattern] = {
        "cccd": CCCD_REGEX,
        "phone": PHONE_REGEX,
        "email": EMAIL_REGEX,
    }

    sanitize_invisible_characters = staticmethod(sanitize_invisible_characters)

    @classmethod
    def mask_text(cls, text: str) -> str:
        """Applies exact regex redaction on plain text string."""
        if not text:
            return ""

        # Step 0: Sanitize invisible zero-width characters and normalize Unicode NFKC
        cleaned_text = sanitize_invisible_characters(text)

        # Mask auth tokens & api keys
        masked = cls.BEARER_REGEX.sub("Bearer [REDACTED_TOKEN]", cleaned_text)
        masked = cls.API_KEY_REGEX.sub(cls.PLACEHOLDER_API_KEY, masked)
        masked = cls.QUERY_SECRET_REGEX.sub(r"\1[REDACTED_SECRET]", masked)

        # Mask CCCD before Phone to prevent 12-digit number partial-match on 10-digit phone
        masked = cls.EMAIL_REGEX.sub(cls.PLACEHOLDER_EMAIL, masked)
        masked = cls.CCCD_REGEX.sub(cls.PLACEHOLDER_CCCD, masked)
        masked = cls.PHONE_REGEX.sub(cls.PLACEHOLDER_PHONE, masked)

        return masked

    @classmethod
    def mask_dict(
        cls,
        data: Dict[str, Any],
        depth: int = 0,
        max_depth: int = 20,
        fail_closed: bool = True,
    ) -> Dict[str, Any]:
        """Recursively masks values in dictionary without mutating input."""
        if depth > max_depth:
            if fail_closed:
                raise PIIRedactionError(f"Max recursion depth {max_depth} exceeded in PII masking.")
            return {"_truncated": "max_depth_exceeded"}

        result: Dict[str, Any] = {}
        for key, value in data.items():
            str_key = str(key)
            safe_key = cls.mask_text(key) if isinstance(key, str) else key
            if safe_key in result:
                if fail_closed:
                    raise PIIRedactionError("Redacted dictionary keys collide.")
                safe_key = f"[REDACTED_KEY_{len(result)}]"
            # Secret key protection
            if str_key.lower() in cls.SECRET_KEYS:
                result[safe_key] = cls.PLACEHOLDER_SECRET
                continue
            if (str_key.lower() in cls.PII_FIELD_KEYS and isinstance(value, (int, float, Decimal))
                    and not isinstance(value, bool)):
                result[safe_key] = cls.PII_FIELD_KEYS[str_key.lower()]
                continue

            result[safe_key] = cls._mask_value(value, depth=depth + 1, max_depth=max_depth, fail_closed=fail_closed)
        return result

    @classmethod
    def mask_list(
        cls,
        data: List[Any],
        depth: int = 0,
        max_depth: int = 20,
        fail_closed: bool = True,
    ) -> List[Any]:
        """Recursively masks items in list without mutating input."""
        if depth > max_depth:
            if fail_closed:
                raise PIIRedactionError(f"Max recursion depth {max_depth} exceeded in PII masking.")
            return ["[TRUNCATED_MAX_DEPTH]"]

        return [
            cls._mask_value(item, depth=depth + 1, max_depth=max_depth, fail_closed=fail_closed)
            for item in data
        ]

    @classmethod
    def _mask_value(
        cls,
        value: Any,
        depth: int = 0,
        max_depth: int = 20,
        fail_closed: bool = True,
    ) -> Any:
        """Internal recursive dispatcher for value masking."""
        if value is None:
            return None
        if isinstance(value, str):
            return cls.mask_text(value)
        if isinstance(value, (int, float, Decimal, bool)):
            return value
        if isinstance(value, dict):
            return cls.mask_dict(value, depth=depth, max_depth=max_depth, fail_closed=fail_closed)
        if isinstance(value, list):
            return cls.mask_list(value, depth=depth, max_depth=max_depth, fail_closed=fail_closed)
        if isinstance(value, tuple):
            return tuple(cls.mask_list(list(value), depth=depth, max_depth=max_depth, fail_closed=fail_closed))
        if isinstance(value, set):
            return {cls._mask_value(item, depth=depth + 1, max_depth=max_depth, fail_closed=fail_closed) for item in value}

        # If object has model_dump (e.g. Pydantic v2)
        if hasattr(value, "model_dump") and callable(getattr(value, "model_dump")):
            try:
                dumped = value.model_dump()
                return cls.mask_dict(dumped, depth=depth, max_depth=max_depth, fail_closed=fail_closed)
            except Exception:
                pass

        # Fallback to string representation masking if safe
        try:
            return cls.mask_text(str(value))
        except Exception as e:
            if fail_closed:
                raise PIIRedactionError(f"Failed to mask unknown value type {type(value)}: {e}") from e
            return "[REDACTION_ERROR]"

    @classmethod
    def mask(
        cls,
        data: Any,
        *,
        fail_closed: bool = True,
        max_depth: int = 20,
    ) -> Any:
        """Public unified entry point for masking text, dicts, lists, and nested objects.

        Args:
            data: Arbitrary text, dict, list, tuple, or primitive to sanitize.
            fail_closed: If True (default), raises PIIRedactionError on unrecoverable failures.
            max_depth: Maximum recursion depth for nested structures.
        """
        try:
            return cls._mask_value(data, depth=0, max_depth=max_depth, fail_closed=fail_closed)
        except PIIRedactionError:
            raise
        except Exception as exc:
            logger.error("PIIMasker unexpected error (%s)", type(exc).__name__)
            if fail_closed:
                raise PIIRedactionError(f"PII redaction failed unexpectedly: {type(exc).__name__}") from exc
            return "[REDACTION_ERROR]"

    @classmethod
    def redact(cls, data: Any, *, fail_closed: bool = True, max_depth: int = 20) -> Any:
        """Semantic alias for mask()."""
        return cls.mask(data, fail_closed=fail_closed, max_depth=max_depth)

    @classmethod
    def has_pii(cls, data: Any) -> bool:
        """Fast check whether text or structure contains any unmasked PII."""
        if not data:
            return False
        if isinstance(data, str):
            cleaned = sanitize_invisible_characters(data)
            return bool(
                cls.CCCD_REGEX.search(cleaned)
                or cls.PHONE_REGEX.search(cleaned)
                or cls.EMAIL_REGEX.search(cleaned)
            )
        if isinstance(data, dict):
            for k, v in data.items():
                if str(k).lower() in cls.SECRET_KEYS:
                    return True
                if isinstance(k, str) and cls.has_pii(k):
                    return True
                if (str(k).lower() in cls.PII_FIELD_KEYS and isinstance(v, (int, float, Decimal))
                        and not isinstance(v, bool)):
                    return True
                if cls.has_pii(v):
                    return True
            return False
        if isinstance(data, (list, tuple, set)):
            return any(cls.has_pii(item) for item in data)
        return False
