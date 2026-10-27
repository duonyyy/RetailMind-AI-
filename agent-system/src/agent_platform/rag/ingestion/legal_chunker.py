"""Module Phân Đoạn Tài Liệu Pháp Lý & Bảng Biểu Đa Cấp Độ (Legal Hierarchy & Table-Aware Chunker).

Tuân thủ quy chuẩn Nghị định 30/2020/NĐ-CP và Luật Ban Hành Văn Bản Quy Phạm Pháp Luật:
1. Regex Engine nhận diện chính xác cây gia phả văn bản: Phần -> Chương -> Mục -> Điều -> Khoản -> Điểm.
2. Contextual Breadcrumbs Injection: Đính kèm gia phả nguồn phân cấp [Tài liệu > Chương > Điều > Khoản > Điểm]
   vào đầu mỗi chunk chống mất bối cảnh (Lost in Context).
3. Table-Aware Preservation: Bảo toàn bảng biểu 100%, tách biệt khối văn xuôi (prose) và bảng (table),
   tự động nhân bản Header cột và Delimiter row (|---|---|) vào mọi sub-chunk khi bảng vượt kích thước,
   không bao giờ cắt xé ngang dòng bảng.
4. Parent-Child Chunking Substrate: Sinh đồng thời parent_chunk (cấp Điều/Chương ~1500-2500 ký tự)
   và child_chunk (cấp Khoản/Điểm ~300-600 ký tự) gắn kết qua parent_id phục vụ Small-to-Big Retrieval.
5. Idempotent Provenance: Sinh mã băm SHA-256 nội dung tất định cho từng chunk.
"""

from __future__ import annotations

import re
import hashlib
import unicodedata
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple


@dataclass
class LegalChunk:
    """Đại diện cho một mẩu văn bản sau phân đoạn phân cấp pháp lý & bảng biểu."""
    id: str
    text: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    parent_id: Optional[str] = None
    is_parent: bool = False
    breadcrumb: str = ""
    chunk_type: str = "child"  # 'parent' | 'child' | 'table' | 'article'
    content_hash: str = ""

    def __post_init__(self) -> None:
        if not self.content_hash and self.text:
            self.content_hash = hashlib.sha256(self.text.encode("utf-8")).hexdigest()


# Alias DocumentChunk to LegalChunk for backward compatibility with existing tests
DocumentChunk = LegalChunk


# ==============================================================================
# 1. BỘ BIỂU THỨC CHÍNH QUY (REGEX ENGINE) PHÂN CẤP QUY CHUẨN NGHỊ ĐỊNH 30/2020/NĐ-CP
# ==============================================================================

RE_PHAN = re.compile(
    r"^(?:PHẦN\s+(?:THỨ\s+[A-ZÀ-Ỹ0-9]+|[IVXLCDM]+|\d+)|Phần\s+.*)",
    re.IGNORECASE,
)
RE_CHUONG = re.compile(
    r"^(?:CHƯƠNG\s+[IVXLCDM\d]+|Chương\s+[IVXLCDM\d]+)",
    re.IGNORECASE,
)
RE_MUC = re.compile(
    r"^(?:MỤC\s+\d+|Mục\s+\d+)",
    re.IGNORECASE,
)
RE_DIEU = re.compile(
    r"^(?:ĐIỀU\s+\d+|Điều\s+\d+)[\.:\s]+(.*)",
    re.IGNORECASE,
)
RE_KHOAN = re.compile(
    r"^(?:\d+)\.\s+(.*)",
)
RE_DIEM = re.compile(
    r"^(?:[a-zđ])\)\s+(.*)",
    re.IGNORECASE,
)


def format_breadcrumb(
    document_title: str,
    hierarchy: Optional[List[str]] = None,
    section_hierarchy: Optional[List[str]] = None,
) -> str:
    """Tạo chuỗi đường dẫn bối cảnh gia phả phân cấp chuẩn hóa Unicode NFC.

    Ví dụ: `[Nghị định 13/2023/NĐ-CP > Chương II > Điều 9 > Khoản 2 > Điểm a]`
    """
    active_hierarchy = hierarchy if hierarchy is not None else section_hierarchy
    parts: List[str] = [document_title.strip()] if document_title else []
    if active_hierarchy:
        for item in active_hierarchy:

            if not item:
                continue
            cleaned = str(item).strip().lstrip("#").strip()
            if cleaned and cleaned not in parts:
                parts.append(cleaned)

    breadcrumb_str = " > ".join(parts)
    breadcrumb_str = unicodedata.normalize("NFC", breadcrumb_str)
    return f"[{breadcrumb_str}]"


def inject_breadcrumb(content: str, breadcrumb: str) -> str:
    """Nhúng chuỗi breadcrumb vào đầu đoạn văn bản."""
    if not breadcrumb:
        return content.strip()
    return f"{breadcrumb}\n{content.strip()}"


# ==============================================================================
# 2. BẢO TỒN BẢNG BIỂU (TABLE-AWARE PRESERVATION)
# ==============================================================================

def is_table_separator(line: str) -> bool:
    """Kiểm tra một dòng có phải là dòng phân cách cột của bảng Markdown (|---|---|)."""
    stripped = line.strip()
    if "|" not in stripped or "-" not in stripped:
        return False
    parts = [p.strip() for p in stripped.split("|")]
    if parts and not parts[0]:
        parts = parts[1:]
    if parts and not parts[-1]:
        parts = parts[:-1]
    if not parts:
        return False
    return all(bool(re.fullmatch(r":?-+:?", p)) for p in parts)


def extract_content_blocks(text: str) -> List[Tuple[str, str]]:
    """Tách văn bản thành các khối xen kẽ gồm văn xuôi ('prose') và bảng biểu ('table').

    Bảo tồn trọn vẹn tiêu đề bảng (table_caption) nếu xuất hiện liền kề ngay trước bảng.
    """
    lines = text.splitlines()
    blocks: List[Tuple[str, str]] = []
    current_lines: List[str] = []
    i = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Nhận diện điểm khởi đầu của bảng Markdown
        if (
            i + 1 < len(lines)
            and stripped.startswith("|")
            and is_table_separator(lines[i + 1])
        ):
            # Kiểm tra xem dòng cuối cùng của current_lines có phải là caption bảng không
            pending_caption = ""
            if current_lines:
                last_line = current_lines[-1].strip()
                if (
                    len(last_line) < 120
                    and (
                        last_line.startswith("#")
                        or re.match(r"^(?:Bảng|Table|Biểu|Phụ lục)\s+", last_line, re.IGNORECASE)
                    )
                ):
                    pending_caption = current_lines.pop().strip()

            if current_lines:
                prose_text = "\n".join(current_lines).strip()
                if prose_text:
                    blocks.append(("prose", prose_text))
                current_lines = []

            # Gom các dòng của bảng
            table_lines = []
            if pending_caption:
                table_lines.append(pending_caption)
            table_lines.extend([line, lines[i + 1]])
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i])
                i += 1

            table_text = "\n".join(table_lines).strip()
            if table_text:
                blocks.append(("table", table_text))
            continue
        else:
            current_lines.append(line)
            i += 1

    if current_lines:
        prose_text = "\n".join(current_lines).strip()
        if prose_text:
            blocks.append(("prose", prose_text))

    return blocks


def split_markdown_table_with_header(
    table_text: str,
    chunk_size: int = 600,
    table_caption: Optional[str] = None,
) -> List[str]:
    """Chia nhỏ bảng Markdown dài theo từng hàng, bảo toàn Header và Delimiter row ở mọi sub-chunk.

    - Nếu độ dài toàn bộ bảng nhỏ hơn hoặc bằng chunk_size: Giữ nguyên 100% trong 1 chunk.
    - Nếu bảng dài vượt ngưỡng: Cắt theo từng dòng dữ liệu, tự động nhân bản Header,
      Delimiter row (|---|---|) và table_caption vào đầu mỗi sub-chunk.
    """
    table_text = table_text.strip()
    lines = [l.strip() for l in table_text.splitlines() if l.strip()]
    if not lines:
        return []

    # Nhận diện caption nếu dòng đầu tiên không phải là dòng bảng
    caption = table_caption or ""
    table_start_idx = 0
    if not lines[0].startswith("|"):
        caption = caption or lines[0]
        table_start_idx = 1

    if len(lines) - table_start_idx < 3:
        # Bảng không đủ cấu trúc header + separator + ít nhất 1 hàng dữ liệu
        full_text = f"{caption}\n{table_text}" if caption and caption not in table_text else table_text
        return [full_text]

    header_line = lines[table_start_idx]
    separator_line = lines[table_start_idx + 1]
    if not is_table_separator(separator_line):
        full_text = f"{caption}\n{table_text}" if caption and caption not in table_text else table_text
        return [full_text]

    # Kiểm tra nếu kích thước tổng thể vừa vặn trong chunk_size
    combined_full = f"{caption}\n{table_text}" if caption and caption not in table_text else table_text
    if len(combined_full) <= chunk_size:
        return [combined_full]

    # Chuẩn bị tiền tố Header cho mọi sub-chunk
    prefix_parts = []
    if caption:
        prefix_parts.append(caption)
    prefix_parts.append(header_line)
    prefix_parts.append(separator_line)
    header_prefix = "\n".join(prefix_parts)

    data_rows = lines[table_start_idx + 2 :]
    sub_chunks: List[str] = []
    current_rows: List[str] = []
    current_len = len(header_prefix) + 1

    for row in data_rows:
        row_len = len(row) + 1
        if current_rows and (current_len + row_len > chunk_size):
            chunk_str = f"{header_prefix}\n" + "\n".join(current_rows)
            sub_chunks.append(chunk_str)
            current_rows = [row]
            current_len = len(header_prefix) + 1 + row_len
        else:
            current_rows.append(row)
            current_len += row_len

    if current_rows:
        chunk_str = f"{header_prefix}\n" + "\n".join(current_rows)
        sub_chunks.append(chunk_str)

    return sub_chunks


def split_text_by_sentence(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 60,
    separators: Optional[List[str]] = None,
) -> List[str]:
    """Cắt nhỏ đoạn văn xuôi dựa trên ranh giới câu tự nhiên của tiếng Việt."""
    if not text:
        return []
    text = text.strip()
    if len(text) <= chunk_size:
        return [text]

    if separators is None:
        separators = ["\n\n", "\n", ". ", "; ", ", ", " "]

    chosen_sep = ""
    for sep in separators:
        if sep in text:
            chosen_sep = sep
            break

    if not chosen_sep:
        # Fallback cắt cứng nếu không tìm thấy ranh giới ngữ nghĩa
        chunks = []
        step = max(1, chunk_size - chunk_overlap)
        for i in range(0, len(text), step):
            sub = text[i : i + chunk_size].strip()
            if sub:
                chunks.append(sub)
        return chunks

    splits = text.split(chosen_sep)
    remaining_seps = [s for s in separators if s != chosen_sep]

    merged_chunks: List[str] = []
    current_chunk: List[str] = []
    current_len = 0

    for item in splits:
        item_len = len(item)
        sep_len = len(chosen_sep) if current_chunk else 0

        if current_len + sep_len + item_len <= chunk_size:
            current_chunk.append(item)
            current_len += sep_len + item_len
        else:
            if current_chunk:
                merged = chosen_sep.join(current_chunk).strip()
                if merged:
                    merged_chunks.append(merged)
                # Overlap window
                overlap_chunk: List[str] = []
                overlap_len = 0
                for part in reversed(current_chunk):
                    if overlap_len + len(part) + len(chosen_sep) <= chunk_overlap:
                        overlap_chunk.insert(0, part)
                        overlap_len += len(part) + len(chosen_sep)
                    else:
                        break
                current_chunk = overlap_chunk
                current_len = overlap_len

            if item_len > chunk_size and remaining_seps:
                sub_splits = split_text_by_sentence(item, chunk_size, chunk_overlap, remaining_seps)
                merged_chunks.extend(sub_splits)
                current_chunk = []
                current_len = 0
            else:
                current_chunk.append(item)
                current_len += (len(chosen_sep) if len(current_chunk) > 1 else 0) + item_len

    if current_chunk:
        merged = chosen_sep.join(current_chunk).strip()
        if merged:
            merged_chunks.append(merged)

    return merged_chunks


# ==============================================================================
# 3. CLASS CHÍNH: LEGAL HIERARCHY CHUNKER
# ==============================================================================

class LegalHierarchyChunker:
    """Bộ phân cắt tài liệu pháp lý chuyên dụng tuân thủ Nghị định 30/2020/NĐ-CP & Luật Ban Hành VBQPPL."""

    @classmethod
    def parse_legal_hierarchy(
        cls,
        text: str,
        doc_title: str = "Tài liệu pháp lý",
    ) -> List[Dict[str, Any]]:
        """Nhận diện toàn bộ cây phân cấp văn bản pháp lý theo Nghị định 30/2020/NĐ-CP.

        Theo dõi trạng thái: Phần -> Chương -> Mục -> Điều -> Khoản -> Điểm.
        Trả về danh sách các nút phân cấp kèm đường dẫn gia phả (breadcrumbs).
        """
        lines = text.splitlines()
        nodes: List[Dict[str, Any]] = []

        curr_phan = ""
        curr_chuong = ""
        curr_muc = ""
        curr_dieu = ""
        curr_khoan = ""
        curr_diem = ""

        current_body_lines: List[str] = []
        current_node_info: Optional[Dict[str, Any]] = None

        def flush_current():
            nonlocal current_node_info, current_body_lines
            if current_node_info:
                body = "\n".join(current_body_lines).strip()
                current_node_info["body"] = body
                nodes.append(current_node_info)
                current_body_lines = []

        for line in lines:
            stripped = line.strip()
            clean_hdr = stripped.lstrip("#").strip()

            if not stripped:
                current_body_lines.append(line)
                continue

            # 1. Nhận diện PHẦN
            if RE_PHAN.match(clean_hdr):
                flush_current()
                curr_phan = clean_hdr
                curr_chuong = ""
                curr_muc = ""
                curr_dieu = ""
                curr_khoan = ""
                curr_diem = ""
                current_node_info = {
                    "level": "phan",
                    "title": curr_phan,
                    "statute": curr_phan,
                    "breadcrumb": format_breadcrumb(doc_title, [curr_phan]),
                    "hierarchy": [curr_phan],
                }
                continue

            # 2. Nhận diện CHƯƠNG
            if RE_CHUONG.match(clean_hdr):
                flush_current()
                curr_chuong = clean_hdr
                curr_muc = ""
                curr_dieu = ""
                curr_khoan = ""
                curr_diem = ""
                h = [p for p in [curr_phan, curr_chuong] if p]
                current_node_info = {
                    "level": "chuong",
                    "title": curr_chuong,
                    "statute": curr_chuong,
                    "breadcrumb": format_breadcrumb(doc_title, h),
                    "hierarchy": h,
                }
                continue

            # 3. Nhận diện MỤC / TIỂU MỤC
            if RE_MUC.match(clean_hdr):
                flush_current()
                curr_muc = clean_hdr
                curr_dieu = ""
                curr_khoan = ""
                curr_diem = ""
                h = [p for p in [curr_phan, curr_chuong, curr_muc] if p]
                current_node_info = {
                    "level": "muc",
                    "title": curr_muc,
                    "statute": curr_muc,
                    "breadcrumb": format_breadcrumb(doc_title, h),
                    "hierarchy": h,
                }
                continue

            # 4. Nhận diện ĐIỀU
            m_dieu = RE_DIEU.match(clean_hdr)
            if m_dieu:
                flush_current()
                # Tách tên điều và tiêu đề điều
                raw_statute = clean_hdr.split(".")[0].split(":")[0].strip()
                curr_dieu = clean_hdr
                curr_khoan = ""
                curr_diem = ""
                h = [p for p in [curr_phan, curr_chuong, curr_muc, raw_statute] if p]
                current_node_info = {
                    "level": "dieu",
                    "title": curr_dieu,
                    "statute": raw_statute,
                    "breadcrumb": format_breadcrumb(doc_title, h),
                    "hierarchy": h,
                }
                continue

            # 5. Nhận diện KHOẢN (ví dụ: '1. ', '2. ')
            m_khoan = RE_KHOAN.match(stripped)
            if m_khoan and curr_dieu:
                flush_current()
                num = stripped.split(".")[0].strip()
                curr_khoan = f"Khoản {num}"
                curr_diem = ""
                raw_statute = curr_dieu.split(".")[0].split(":")[0].strip()
                h = [p for p in [curr_phan, curr_chuong, curr_muc, raw_statute, curr_khoan] if p]
                current_node_info = {
                    "level": "khoan",
                    "title": f"{curr_khoan}: {m_khoan.group(1)[:50]}",
                    "statute": f"{raw_statute} {curr_khoan}",
                    "breadcrumb": format_breadcrumb(doc_title, h),
                    "hierarchy": h,
                }
                current_body_lines.append(stripped)
                continue

            # 6. Nhận diện ĐIỂM (ví dụ: 'a) ', 'b) ', 'đ) ')
            m_diem = RE_DIEM.match(stripped)
            if m_diem and curr_khoan:
                flush_current()
                point_char = stripped[0].lower()
                curr_diem = f"Điểm {point_char}"
                raw_statute = curr_dieu.split(".")[0].split(":")[0].strip()
                h = [p for p in [curr_phan, curr_chuong, curr_muc, raw_statute, curr_khoan, curr_diem] if p]
                current_node_info = {
                    "level": "diem",
                    "title": f"{curr_diem}: {m_diem.group(1)[:50]}",
                    "statute": f"{raw_statute} {curr_khoan} {curr_diem}",
                    "breadcrumb": format_breadcrumb(doc_title, h),
                    "hierarchy": h,
                }
                current_body_lines.append(stripped)
                continue

            current_body_lines.append(line)

        flush_current()

        # Fallback nếu văn bản không chứa thẻ cấu trúc chuẩn
        if not nodes:
            nodes.append({
                "level": "document",
                "title": doc_title,
                "statute": "Toàn văn",
                "breadcrumb": format_breadcrumb(doc_title),
                "hierarchy": [doc_title],
                "body": text.strip(),
            })

        return nodes

    @classmethod
    def chunk_document(
        cls,
        text: str,
        doc_title: str = "Tài liệu",
        doc_id: str = "DOC_01",
        chunk_size: int = 600,
        chunk_overlap: int = 80,
    ) -> List[LegalChunk]:
        """Phân đoạn tài liệu pháp lý bảo toàn cấu trúc và nhúng Breadcrumbs vào từng chunk."""
        if not text:
            return []

        nodes = cls.parse_legal_hierarchy(text, doc_title=doc_title)
        final_chunks: List[LegalChunk] = []
        chunk_counter = 1

        for node in nodes:
            breadcrumb = node["breadcrumb"]
            body = node.get("body", "").strip()
            title = node.get("title", "")
            statute = node.get("statute", "Mục")
            level = node.get("level", "section")

            content_to_chunk = f"{title}\n{body}" if title and title not in body else body
            if not content_to_chunk.strip():
                continue

            # Phân tách khối văn xuôi và khối bảng biểu
            blocks = extract_content_blocks(content_to_chunk)

            for b_type, b_content in blocks:
                if b_type == "table":
                    # Xử lý bảo toàn bảng biểu
                    table_sub_chunks = split_markdown_table_with_header(
                        b_content, chunk_size=chunk_size
                    )
                    for t_sub in table_sub_chunks:
                        enriched = inject_breadcrumb(t_sub, breadcrumb)
                        cid = f"{doc_id}_C{chunk_counter:03d}"
                        final_chunks.append(
                            LegalChunk(
                                id=cid,
                                text=enriched,
                                metadata={
                                    "title": doc_title,
                                    "doc_id": doc_id,
                                    "statute": statute,
                                    "level": level,
                                    "chunk_type": "table",
                                    "is_table": True,
                                },
                                is_parent=False,
                                breadcrumb=breadcrumb,
                                chunk_type="table",
                            )
                        )
                        chunk_counter += 1
                else:
                    # Xử lý văn xuôi theo ranh giới câu tự nhiên
                    prose_sub_chunks = split_text_by_sentence(
                        b_content, chunk_size=chunk_size, chunk_overlap=chunk_overlap
                    )
                    for p_sub in prose_sub_chunks:
                        enriched = inject_breadcrumb(p_sub, breadcrumb)
                        cid = f"{doc_id}_C{chunk_counter:03d}"
                        final_chunks.append(
                            LegalChunk(
                                id=cid,
                                text=enriched,
                                metadata={
                                    "title": doc_title,
                                    "doc_id": doc_id,
                                    "statute": statute,
                                    "level": level,
                                    "chunk_type": "prose",
                                    "is_table": False,
                                },
                                is_parent=False,
                                breadcrumb=breadcrumb,
                                chunk_type="child",
                            )
                        )
                        chunk_counter += 1

        return final_chunks

    @classmethod
    def chunk_hierarchical_parent_child(
        cls,
        text: str,
        doc_id: str,
        source_title: str = "Văn bản pháp quy",
        parent_size: int = 2000,
        child_size: int = 500,
        child_overlap: int = 80,
    ) -> Tuple[List[LegalChunk], List[LegalChunk]]:
        """Phân đoạn phân cấp 2 tầng Parent-Child (Small-to-Big Retrieval):

        - Tầng Cha (Parent Chunk): Đại diện cho cấp Điều hoặc Chương (~1500-2500 ký tự)
          cung cấp toàn cảnh ngữ cảnh cho LLM.
        - Tầng Con (Child Chunk): Đại diện cho cấp Khoản hoặc Điểm (~300-600 ký tự),
          nhúng đường dẫn gia phả (breadcrumb), gắn parent_id liên kết với khối cha.
        """
        if not text:
            return [], []

        # 1. Nhận diện các nút phân cấp pháp lý
        nodes = cls.parse_legal_hierarchy(text, doc_title=source_title)

        # 2. Gom các nút thành các khối Parent (cấp Điều/Chương hoặc nhóm nút <= parent_size)
        parents: List[LegalChunk] = []
        parent_node_groups: List[Tuple[str, str, str, List[Dict[str, Any]]]] = []

        current_group: List[Dict[str, Any]] = []
        current_len = 0
        current_statute = ""
        current_title = ""

        for node in nodes:
            n_text = f"{node['title']}\n{node.get('body', '')}".strip()
            n_len = len(n_text)

            # Nếu là cấp Điều hoặc Chương mới hoặc nhóm đã quá dài
            is_major_boundary = node.get("level") in {"phan", "chuong", "dieu"}

            if current_group and (is_major_boundary or current_len + n_len > parent_size):
                pid = f"{doc_id}_P{len(parents):02d}"
                p_text = "\n\n".join(
                    [f"{n['title']}\n{n.get('body', '')}".strip() for n in current_group]
                ).strip()
                p_breadcrumb = format_breadcrumb(source_title, [current_statute])

                parent_chunk = LegalChunk(
                    id=pid,
                    text=p_text,
                    metadata={
                        "title": source_title,
                        "doc_id": doc_id,
                        "parent_id": pid,
                        "statute": current_statute,
                        "chunk_type": "parent",
                        "is_parent": True,
                    },
                    is_parent=True,
                    breadcrumb=p_breadcrumb,
                    chunk_type="parent",
                )
                parents.append(parent_chunk)
                parent_node_groups.append((pid, current_statute, p_breadcrumb, current_group))

                current_group = [node]
                current_len = n_len
                current_statute = node.get("statute", "Mục")
                current_title = node.get("title", "")
            else:
                if not current_group:
                    current_statute = node.get("statute", "Mục")
                    current_title = node.get("title", "")
                current_group.append(node)
                current_len += n_len

        if current_group:
            pid = f"{doc_id}_P{len(parents):02d}"
            p_text = "\n\n".join(
                [f"{n['title']}\n{n.get('body', '')}".strip() for n in current_group]
            ).strip()
            p_breadcrumb = format_breadcrumb(source_title, [current_statute])

            parent_chunk = LegalChunk(
                id=pid,
                text=p_text,
                metadata={
                    "title": source_title,
                    "doc_id": doc_id,
                    "parent_id": pid,
                    "statute": current_statute,
                    "chunk_type": "parent",
                    "is_parent": True,
                },
                is_parent=True,
                breadcrumb=p_breadcrumb,
                chunk_type="parent",
            )
            parents.append(parent_chunk)
            parent_node_groups.append((pid, current_statute, p_breadcrumb, current_group))

        # 3. Phân rã từng khối Parent thành các Child Chunk gắn parent_id
        children: List[LegalChunk] = []

        for pid, p_statute, p_breadcrumb, node_list in parent_node_groups:
            child_counter = 0

            for node in node_list:
                node_body = node.get("body", "").strip()
                node_title = node.get("title", "")
                node_breadcrumb = node.get("breadcrumb", p_breadcrumb)

                content_to_chunk = f"{node_title}\n{node_body}" if node_title and node_title not in node_body else node_body
                if not content_to_chunk.strip():
                    continue

                blocks = extract_content_blocks(content_to_chunk)

                for b_type, b_content in blocks:
                    if b_type == "table":
                        table_subs = split_markdown_table_with_header(
                            b_content, chunk_size=child_size
                        )
                        for t_sub in table_subs:
                            cid = f"{pid}_C{child_counter:02d}"
                            enriched_text = inject_breadcrumb(t_sub, node_breadcrumb)
                            children.append(
                                LegalChunk(
                                    id=cid,
                                    text=enriched_text,
                                    metadata={
                                        "title": source_title,
                                        "doc_id": doc_id,
                                        "parent_id": pid,
                                        "child_id": cid,
                                        "statute": node.get("statute", p_statute),
                                        "is_parent": False,
                                        "chunk_type": "table",
                                    },
                                    parent_id=pid,
                                    is_parent=False,
                                    breadcrumb=node_breadcrumb,
                                    chunk_type="child",
                                )
                            )
                            child_counter += 1
                    else:
                        prose_subs = split_text_by_sentence(
                            b_content, chunk_size=child_size, chunk_overlap=child_overlap
                        )
                        for p_sub in prose_subs:
                            cid = f"{pid}_C{child_counter:02d}"
                            enriched_text = inject_breadcrumb(p_sub, node_breadcrumb)
                            children.append(
                                LegalChunk(
                                    id=cid,
                                    text=enriched_text,
                                    metadata={
                                        "title": source_title,
                                        "doc_id": doc_id,
                                        "parent_id": pid,
                                        "child_id": cid,
                                        "statute": node.get("statute", p_statute),
                                        "is_parent": False,
                                        "chunk_type": "prose",
                                    },
                                    parent_id=pid,
                                    is_parent=False,
                                    breadcrumb=node_breadcrumb,
                                    chunk_type="child",
                                )
                            )
                            child_counter += 1

        return parents, children

    @classmethod
    def chunk_markdown(
        cls,
        markdown_text: str,
        source_title: str = "Tài liệu",
    ) -> List[Dict[str, Any]]:
        """API tương thích ngược với Decree30HierarchicalChunker.chunk_markdown."""
        chunks = cls.chunk_document(markdown_text, doc_title=source_title, chunk_size=600)
        results = []
        for idx, c in enumerate(chunks):
            results.append({
                "id": c.id,
                "title": c.metadata.get("title", source_title),
                "statute": c.metadata.get("statute", f"Mục {idx + 1}"),
                "header": c.metadata.get("statute", f"Mục {idx + 1}"),
                "breadcrumb": c.breadcrumb,
                "content": c.text,
                "raw_text": c.text,
                "page": 1,
            })
        return results
