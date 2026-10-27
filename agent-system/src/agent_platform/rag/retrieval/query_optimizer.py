"""Production Pre-Retrieval Query Optimizer.

Implements Chapter 7 Techniques:
1. Conversational Query De-contextualization (Coreference Resolution)
2. Multi-Query Expansion
3. HyDE (Hypothetical Document Embeddings)
4. Self-Querying Metadata Filter Extraction
"""

from __future__ import annotations
import re
from typing import List, Dict, Any, Tuple


class ProductionQueryOptimizer:
    """Pre-retrieval query optimizer resolving semantic gaps and coreference."""

    PRONOUNS_VI = {"nó", "chúng nó", "khoản này", "điều này", "sản phẩm này", "trên", "đó"}

    @classmethod
    def rewrite_conversational_query(
        cls,
        chat_history: List[Dict[str, str]],
        current_query: str
    ) -> str:
        """Khử đại từ thay thế (Coreference Resolution) dựa trên lịch sử hội thoại gần nhất.
        Ví dụ: Turn 1: 'Chính sách bảo hành iPhone 15 là gì?'
               Turn 2: 'Thế còn pin của nó thì sao?'
               -> Viết lại: 'Pin của iPhone 15 có chính sách bảo hành thế nào?'
        """
        if not chat_history:
            return current_query

        # Find the last user subject if pronoun detected
        query_lower = current_query.lower()
        has_pronoun = any(p in query_lower for p in cls.PRONOUNS_VI)

        if not has_pronoun:
            return current_query

        # Extract last user query
        last_user_query = ""
        for msg in reversed(chat_history):
            if msg.get("role") == "user":
                last_user_query = msg.get("content", "")
                break

        if not last_user_query:
            return current_query

        # Heuristic subject stitching for offline speed
        clean_last = re.sub(r'^(chính sách|cho tôi hỏi|tra cứu|hỏi về)\s+', '', last_user_query, flags=re.IGNORECASE)
        clean_last = clean_last.split('?')[0].strip()

        # Replace 'nó' with subject
        rewritten = re.sub(r'\bnó\b', f"sản phẩm ({clean_last})", current_query, flags=re.IGNORECASE)
        rewritten = re.sub(r'\b(điều|khoản)\s+này\b', f"quy định ({clean_last})", rewritten, flags=re.IGNORECASE)
        return rewritten

    @classmethod
    def expand_multi_queries(
        cls, query: str, n: int = 3, synonym_dict: Optional[Dict[str, str]] = None
    ) -> List[str]:
        """Multi-Query Expansion: Tạo ra các biến thể diễn đạt từ đồng nghĩa."""
        variants = [query]
        synonyms = synonym_dict or {}
        for term, syn in synonyms.items():
            if term in query.lower() and len(variants) < n:
                expanded = re.sub(re.escape(term), syn, query, flags=re.IGNORECASE)
                if expanded not in variants:
                    variants.append(expanded)

        return variants[:n]

    @classmethod
    def extract_self_query_filters(cls, query: str) -> Tuple[str, Dict[str, Any]]:
        """Self-Querying: Bóc tách bộ lọc siêu dữ liệu (Metadata Filters) từ câu hỏi tự nhiên."""
        filters: Dict[str, Any] = {}
        clean_query = query

        # Year filter (e.g. năm 2024, 2025, 2026)
        year_match = re.search(r'\bnăm\s+(\d{4})\b', query, re.IGNORECASE)
        if year_match:
            filters["year"] = int(year_match.group(1))

        # Generic section/clause filter (e.g. Điều N, Mục N, Khoản N)
        statute_match = re.search(r'\b(Điều\s+\d+|Mục\s+\d+|Khoản\s+\d+)\b', query, re.IGNORECASE)
        if statute_match:
            filters["statute"] = statute_match.group(1)

        return clean_query, filters

    extract_self_querying_filters = extract_self_query_filters

    @classmethod
    def generate_hyde_document(cls, query: str) -> str:
        """HyDE: Sinh văn bản giả định trả lời cho câu hỏi để tối ưu hóa vector embedding."""
        return (
            f"Tài liệu quy định và căn cứ pháp lý hướng dẫn chi tiết về nội dung: '{query}'. "
            f"Văn bản quy định rõ các điều kiện, quyền hạn, nghĩa vụ và các bước thực thi chuẩn doanh nghiệp."
        )
