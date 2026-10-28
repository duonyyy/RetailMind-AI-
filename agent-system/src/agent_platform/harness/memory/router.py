"""Memory Intent Router.

Adapted from VinAI Track 3 Day 17 architecture for RetailMind AI.
Routes incoming user queries to only the relevant memory layers,
cutting down redundant database queries, vector lookups, and latency.
"""

from __future__ import annotations
from typing import List


SHORT_TERM_HINTS = (
    "vua",
    "vừa",
    "gan day",
    "gần đây",
    "luot truoc",
    "lượt trước",
    "tin nhan",
    "tin nhắn",
    "recent",
    "truoc do",
    "trước đó",
    "lai di",
    "lại đi",
    "dang noi",
    "đang nói",
)

LONG_TERM_HINTS = (
    "thich",
    "thích",
    "uu tien",
    "ưu tiên",
    "preference",
    "ngan sach",
    "ngân sách",
    "so thich",
    "sở thích",
    "profile",
    "cua toi",
    "của tôi",
    "hop voi toi",
    "hợp với tôi",
    "goi y cho toi",
    "gợi ý cho tôi",
)

EPISODIC_HINTS = (
    "lan truoc",
    "lần trước",
    "da thu",
    "đã thử",
    "fix",
    "trajectory",
    "reflection",
    "su co",
    "sự cố",
    "kinh nghiem",
    "kinh nghiệm",
    "tung bi",
    "từng bị",
    "loi cu",
    "lỗi cũ",
    "lan truoc gap",
    "lần trước gặp",
)

SEMANTIC_HINTS = (
    "quy tac",
    "quy tắc",
    "policy",
    "chinh sach",
    "chính sách",
    "doi tra",
    "đổi trả",
    "bao hanh",
    "bảo hành",
    "tra gop",
    "trả góp",
    "dieu khoan",
    "điều khoản",
    "khuyen mai",
    "khuyến mãi",
    "thu tuc",
    "thủ tục",
    "thoi gian",
    "thời gian",
)


def route_memory_query(query: str) -> List[str]:
    """
    Classifies user query intent and identifies active memory layers.
    Returns:
        List of layer names e.g. ["short_term", "long_term"]
    """
    if not query:
        return ["short_term", "long_term"]

    q = query.casefold()

    layers: List[str] = []
    if any(hint in q for hint in SHORT_TERM_HINTS):
        layers.append("short_term")
    if any(hint in q for hint in LONG_TERM_HINTS):
        layers.append("long_term")
    if any(hint in q for hint in EPISODIC_HINTS):
        layers.append("episodic")
    if any(hint in q for hint in SEMANTIC_HINTS):
        layers.append("semantic")

    # If no specific layer matched, default to standard user interaction trio
    return layers if layers else ["short_term", "long_term", "semantic"]

