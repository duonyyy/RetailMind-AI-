import re
from typing import List

INJECTION_PATTERNS: List[re.Pattern] = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?instructions", re.IGNORECASE),
    re.compile(r"bỏ\s+qua\s+(hết\s+)?(toàn\s+bộ\s+)?hướng\s+dẫn\s+trước", re.IGNORECASE),
    re.compile(r"quên\s+(hết\s+)?các\s+chỉ\s+dẫn", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+dan\s+mode", re.IGNORECASE),
    re.compile(r"system\s*:\s*override", re.IGNORECASE),
    re.compile(r"reveal\s+your\s+system\s+prompt", re.IGNORECASE),
    re.compile(r"cho\s+tôi\s+biết\s+system\s+prompt", re.IGNORECASE),
]

class PromptInjectionDetector:
    """Detects adversarial jailbreaks and direct prompt injection attempts."""

    @staticmethod
    def is_injection(text: str) -> bool:
        if not text:
            return False
        for pattern in INJECTION_PATTERNS:
            if pattern.search(text):
                return True
        return False
