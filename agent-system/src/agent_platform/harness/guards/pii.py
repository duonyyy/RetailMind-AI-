import re
from typing import Dict, Pattern

class PIIMasker:
    """
    Masks Vietnamese personally identifiable information (PII)
    in compliance with Decree 13/2023/ND-CP and Personal Data Protection Law.
    """

    PATTERNS: Dict[str, Pattern] = {
        # VN Phone Number (03, 05, 07, 08, 09...)
        "phone": re.compile(r"\b(0[3|5|7|8|9]\d{8})\b"),
        # CCCD (12 digits)
        "cccd": re.compile(r"\b(\d{12})\b"),
        # Email
        "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    }

    @classmethod
    def mask(cls, text: str) -> str:
        if not text:
            return ""

        masked = cls.PATTERNS["phone"].sub(r"[PHONE_MASKED]", text)
        masked = cls.PATTERNS["cccd"].sub(r"[CCCD_MASKED]", masked)
        masked = cls.PATTERNS["email"].sub(r"[EMAIL_MASKED]", masked)
        return masked
