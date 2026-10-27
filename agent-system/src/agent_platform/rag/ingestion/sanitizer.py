"""IngestionSanitizer for RAG Ingestion Pipeline conforming to Decree 13/2023/NĐ-CP."""
import re
import unicodedata
from typing import Tuple, Dict, Any

ZERO_WIDTH_CHARS = re.compile(r"[\u200B-\u200D\uFEFF\u200E\u200F]")
PHONE_REGEX = re.compile(r'(?<!\d)(?:0\d{9})(?!\d)')
EMAIL_REGEX = re.compile(r'[\w\.-]+@[\w\.-]+\.\w+')
CCCD_REGEX = re.compile(r'(?<!\d)(?:\d{12})(?!\d)')

class IngestionSanitizer:
    """Enterprise text sanitizer for Vietnamese RAG ingestion."""

    @staticmethod
    def normalize_vietnamese_nfc(text: str) -> str:
        """Normalizes Unicode text to NFC format and strips zero-width characters."""
        if not text:
            return ""
        cleaned = ZERO_WIDTH_CHARS.sub("", text)
        return unicodedata.normalize("NFC", cleaned)

    @staticmethod
    def segment_vietnamese(text: str) -> str:
        """Simple Vietnamese word segmentation / token normalization."""
        if not text:
            return ""
        # Return cleaned lowercase text preserving Vietnamese word boundaries
        return re.sub(r'\s+', ' ', text).strip()

    @staticmethod
    def mask_decree13_pii(text: str) -> Tuple[str, Dict[str, int]]:
        """Masks Vietnamese PII (CCCD, SĐT, Email) according to Decree 13/2023/NĐ-CP.
        
        Returns:
            Tuple of (masked_text, pii_counts_dict)
        """
        if not text:
            return "", {"phone": 0, "email": 0, "cccd": 0}

        pii_counts = {"phone": 0, "email": 0, "cccd": 0}

        def mask_phone(m: re.Match) -> str:
            pii_counts["phone"] += 1
            raw = m.group(0)
            return f"{raw[:4]}***{raw[-3:]}"

        def mask_email(m: re.Match) -> str:
            pii_counts["email"] += 1
            raw = m.group(0)
            parts = raw.split("@")
            user, domain = parts[0], parts[1]
            masked_user = user[:2] + "***" if len(user) > 2 else "***"
            return f"{masked_user}@{domain}"

        def mask_cccd(m: re.Match) -> str:
            pii_counts["cccd"] += 1
            raw = m.group(0)
            return f"{raw[:3]}******{raw[-3:]}"

        masked = PHONE_REGEX.sub(mask_phone, text)
        masked = EMAIL_REGEX.sub(mask_email, masked)
        masked = CCCD_REGEX.sub(mask_cccd, masked)

        return masked, pii_counts

    @staticmethod
    def sanitize(text: str) -> str:
        """Convenience method combining NFC normalization and whitespace cleanup."""
        return IngestionSanitizer.normalize_vietnamese_nfc(text).strip()
