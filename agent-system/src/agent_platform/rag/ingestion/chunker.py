"""Decree 30/2020/ND-CP Hierarchical Chunker for Vietnamese Administrative Documents.

Supports Structure-Aware Chunking, Contextual Breadcrumbs, and Parent-Child Small-to-Big Retrieval.
"""

from __future__ import annotations
import re
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass, field


@dataclass
class DocumentChunk:
    id: str
    text: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    parent_id: str | None = None
    is_parent: bool = False
    breadcrumb: str = ""
    content_hash: str = ""


# Re-export LegalHierarchyChunker for flexible importing
from .legal_chunker import LegalHierarchyChunker



class Decree30HierarchicalChunker:
    """Chunks legal and administrative documents into hierarchical units (Điều, Khoản)."""

    ARTICLE_PATTERN = re.compile(r'(^|\n)(Điều\s+\d+[\.:]?\s*[^\n]+)', re.IGNORECASE)

    @classmethod
    def chunk_markdown(cls, markdown_text: str, source_title: str = "Tài liệu") -> List[Dict[str, Any]]:
        """Standard Structure-Aware chunking preserving headers, statutes, and breadcrumbs."""
        if not markdown_text:
            return []

        chunks: List[Dict[str, Any]] = []
        # Split by header ## or Điều
        sections = re.split(r'\n(?=##?\s+|Điều\s+\d+)', markdown_text)

        for idx, sec in enumerate(sections):
            text = sec.strip()
            if not text:
                continue

            lines = text.split('\n')
            header = lines[0].replace('#', '').strip()

            # Extract statute reference (Nghị định 30 Điều/Khoản)
            statute_match = re.search(r'(Điều\s+\d+)', header, re.IGNORECASE)
            statute = statute_match.group(1) if statute_match else f"Mục {idx + 1}"

            # Contextual Breadcrumb
            breadcrumb = f"[{source_title} > {statute}: {header}]"
            enriched_content = f"{breadcrumb}\n{text}"

            chunks.append({
                "id": f"chunk_{idx + 1:03d}",
                "title": source_title,
                "statute": statute,
                "header": header,
                "breadcrumb": breadcrumb,
                "content": enriched_content,
                "raw_text": text,
                "page": 1,
            })

        return chunks

    @classmethod
    def chunk_hierarchical_parent_child(
        cls,
        text: str,
        doc_id: str,
        source_title: str = "Văn bản pháp quy",
        parent_size: int = 1500,
        child_size: int = 350,
        child_overlap: int = 60
    ) -> Tuple[List[DocumentChunk], List[DocumentChunk]]:
        """Two-tier Parent-Child (Small-to-Big) Chunking:
        - Child Chunks (small, high semantic density) are indexed into Vector Search.
        - Parent Chunks (broad context) are returned to the LLM to eliminate hallucination.
        """
        if not text:
            return [], []

        # Split text into Parent blocks by Article or Paragraph
        article_pattern = re.compile(r"(Điều\s+\d+[\.:\s]+[^\n]+)")
        sections = article_pattern.split(text)

        raw_blocks: List[str] = []
        if len(sections) > 1:
            for i in range(1, len(sections), 2):
                hdr = sections[i].strip()
                bdy = sections[i + 1].strip() if i + 1 < len(sections) else ""
                raw_blocks.append(f"{hdr}\n{bdy}")
        else:
            raw_blocks = [b.strip() for b in text.split("\n\n") if b.strip()]

        parents: List[DocumentChunk] = []
        current_parent_text = ""
        parent_idx = 0

        for block in raw_blocks:
            if len(current_parent_text) + len(block) < parent_size:
                current_parent_text += ("\n\n" + block if current_parent_text else block)
            else:
                if current_parent_text:
                    pid = f"{doc_id}_P{parent_idx:02d}"
                    parents.append(DocumentChunk(
                        id=pid,
                        text=current_parent_text,
                        metadata={"title": source_title, "doc_id": doc_id, "parent_id": pid},
                        is_parent=True
                    ))
                    parent_idx += 1
                current_parent_text = block

        if current_parent_text:
            pid = f"{doc_id}_P{parent_idx:02d}"
            parents.append(DocumentChunk(
                id=pid,
                text=current_parent_text,
                metadata={"title": source_title, "doc_id": doc_id, "parent_id": pid},
                is_parent=True
            ))

        # Split parents into child chunks with Breadcrumbs
        children: List[DocumentChunk] = []
        for p in parents:
            p_text = p.text
            pid = p.id
            start = 0
            child_idx = 0
            while start < len(p_text):
                end = start + child_size
                c_slice = p_text[start:end].strip()
                if c_slice:
                    cid = f"{pid}_C{child_idx:02d}"
                    breadcrumb = f"[{source_title} > {pid}]"
                    children.append(DocumentChunk(
                        id=cid,
                        text=f"{breadcrumb} {c_slice}",
                        metadata={"title": source_title, "parent_id": pid, "child_id": cid, "doc_id": doc_id},
                        parent_id=pid,
                        is_parent=False
                    ))
                    child_idx += 1
                start += (child_size - child_overlap)

        return parents, children
