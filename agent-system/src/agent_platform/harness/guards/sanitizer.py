import re
import unicodedata

ZERO_WIDTH_CHARS = re.compile(r"[\u200B-\u200D\uFEFF\u200E\u200F]")

class InputSanitizer:
    """Removes invisible characters, zero-width spaces and normalizes Unicode."""

    @staticmethod
    def sanitize(text: str) -> str:
        if not text:
            return ""
        # Strip zero-width chars
        cleaned = ZERO_WIDTH_CHARS.sub("", text)
        # Normalize Unicode
        cleaned = unicodedata.normalize("NFKC", cleaned)
        # Clean extra whitespace
        return cleaned.strip()
