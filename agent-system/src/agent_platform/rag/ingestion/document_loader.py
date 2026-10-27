"""Enterprise Multi-Format Document Loader.

Complies with Enterprise Data Lakehouse Architecture:
- Parses .pdf, .docx, .xlsx, .html, .md, .txt documents from data/raw_documents/ or custom paths.
- High-fidelity PDF extraction via PyMuPDF (fitz) with automatic table detection and Markdown conversion.
- DOCX parsing preserving hierarchical headings (#, ##, ###) and table grids.
- XLSX parsing transforming worksheets into GitHub-Flavored Markdown tables.
- HTML cleaning and tabular extraction via BeautifulSoup4.
- Automated TCVN3/VnTime legacy font detection and Unicode NFC normalization.
- Transparent warning for scanned image-only PDFs requiring OCR.
- Integration with IngestionSanitizer and DataContractValidator / Quarantine DLQ.
"""

from __future__ import annotations

import os
import re
import hashlib
import logging
import unicodedata
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple

from .sanitizer import IngestionSanitizer
from .data_contract import DataContractValidator, QuarantineDLQManager


logger = logging.getLogger(__name__)

# Bảng tra cứu toàn diện chuyển đổi ký tự TCVN3 (ABC/.VnTime/.VnArial) sang Unicode chuẩn NFC
TCVN3_MAP: Dict[str, str] = {
    '©': 'â', 'ª': 'ê', '«': 'ô', '¬': 'ơ', '®': 'đ', '§': 'Đ',
    'µ': 'à', '¸': 'á', '¶': 'ả', '·': 'ã', '¹': 'ạ',
    '¨': 'ă', '»': 'ằ', '¾': 'ắ', '¼': 'ẳ', '½': 'ẵ', 'Æ': 'ặ',
    'Ç': 'ầ', 'Ê': 'ấ', 'È': 'ẩ', 'É': 'ẫ', 'Ë': 'ậ',
    'Ì': 'è', 'Ð': 'é', 'Î': 'ẻ', 'Ï': 'ẽ', 'Ñ': 'ẹ',
    'Ò': 'ề', 'Õ': 'ế', 'Ó': 'ể', 'Ô': 'ễ', 'Ö': 'ệ',
    '×': 'ì', 'Ø': 'í', 'Ù': 'ỉ', 'Ú': 'ĩ', 'Û': 'ị', 'Þ': 'ị',
    'Ü': 'ò', 'Ý': 'ó', 'ß': 'õ', 'à': 'ọ',
    'á': 'ỏ', 'â': 'ổ', 'ã': 'ỗ', 'ä': 'ố', 'å': 'ộ',
    'æ': 'ờ', 'ç': 'ở', 'è': 'ố', 'é': 'ộ', 'ê': 'ờ',
    'ë': 'ở', 'ì': 'ỡ', 'î': 'ợ', 'ï': 'ụ', 'ñ': 'ủ',
    'ó': 'ú', 'ô': 'ự', 'õ': 'ỳ', 'ö': 'ỷ', '÷': 'ỹ',
    'ø': 'ứ', 'ù': 'ự', 'ú': 'ì', 'ü': 'ò', 'ý': 'ó',
    'μ': 'à', '−': 'ư', '\xad': 'ư',
    '¡': 'Ă', '¢': 'Â', '£': 'Ê', '¤': 'Ô', '¥': 'Ơ', '¦': 'Ư',
}

# Tập ký tự đặc trưng nhận diện bảng mã TCVN3
TCVN3_DISTINCTIVE_CHARS = set("©ª«¬®§µ¸¶·¹¨»¾¼½ÆÇÊÈÉËÌÐÎÏÑÒÕÓÔÖ×ØÙÚÛÞÜÝßæçëìîïñøù−\xad¡¢£¤¥¦")

UNICODE_VIET_PATTERN = re.compile(r"[\u0110\u0111\u01A0\u01A1\u01AF\u01B0\u1EA0-\u1EF9]")


def is_unicode_vietnamese(text: str) -> bool:
    """Kiểm tra văn bản có chứa các ký tự đặc trưng chuẩn Unicode dựng sẵn của tiếng Việt."""
    return bool(UNICODE_VIET_PATTERN.search(text))


def is_tcvn3(text: str, threshold: int = 2) -> bool:
    """Tự động phát hiện xem chuỗi văn bản có sử dụng bảng mã TCVN3 hay không.
    
    Nếu văn bản đã chứa các ký tự chuẩn Unicode tiếng Việt (như ơ, ư, đ, Đ, các nguyên âm có dấu \u1EA0-\u1EF9),
    thì không coi là TCVN3 để tránh làm biến dạng văn bản Unicode chuẩn.
    """
    if not text:
        return False
    if is_unicode_vietnamese(text):
        return False
    match_count = sum(1 for c in text if c in TCVN3_DISTINCTIVE_CHARS)
    return match_count >= threshold


def decode_tcvn3(text: str, force: bool = False) -> str:
    """Chuyển đổi chuỗi ký tự TCVN3 (.VnTime, .VnArial) sang Unicode dựng sẵn chuẩn NFC.

    Args:
        text: Chuỗi văn bản mã hóa TCVN3.
        force: Nếu True, bỏ qua kiểm tra an toàn Unicode.

    Returns:
        Chuỗi văn bản Unicode chuẩn NFC.
    """
    if not text:
        return ""
    if not force and is_unicode_vietnamese(text) and not is_tcvn3(text):
        return unicodedata.normalize("NFC", text)
    decoded = "".join(TCVN3_MAP.get(c, c) for c in text)
    return unicodedata.normalize("NFC", decoded)



def matrix_to_markdown_table(rows: List[List[Any]]) -> str:
    """Chuyển ma trận 2 chiều thành cấu trúc bảng GitHub-Flavored Markdown chuẩn."""
    if not rows:
        return ""

    cleaned_rows: List[List[str]] = []
    for r in rows:
        c_row = [str(c if c is not None else "").replace("\n", " ").replace("|", "\\|").strip() for c in r]
        cleaned_rows.append(c_row)

    if not cleaned_rows:
        return ""

    # Xác định số cột tối đa
    max_cols = max(len(r) for r in cleaned_rows)
    if max_cols == 0:
        return ""

    # Đệm thêm ô trống cho các hàng ngắn hơn
    padded_rows = [r + [""] * (max_cols - len(r)) for r in cleaned_rows]

    header = padded_rows[0]
    sep = ["---"] * max_cols
    header_str = "| " + " | ".join(header) + " |"
    sep_str = "| " + " | ".join(sep) + " |"

    data_lines = ["| " + " | ".join(r) + " |" for r in padded_rows[1:]]
    return "\n".join([header_str, sep_str] + data_lines)


@dataclass
class LoadedDocument:
    """DTO lưu trữ tài liệu sau khi bóc tách đa định dạng."""
    doc_id: str
    filename: str
    file_path: str
    file_type: str
    content: str
    raw_content: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_valid: bool = True
    quarantine_id: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.raw_content:
            self.raw_content = self.content
        if "content_sha256" not in self.metadata and self.content:
            self.metadata["content_sha256"] = hashlib.sha256(self.content.encode("utf-8")).hexdigest()


class EnterpriseDocumentLoader:
    """Bộ nạp & chuyển đổi tài liệu đa định dạng (PDF/DOCX/XLSX/HTML/MD/TXT) chuẩn doanh nghiệp."""

    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".html", ".htm", ".md", ".txt"}

    def __init__(
        self,
        auto_decode_tcvn3: bool = True,
        contract_validator: Optional[DataContractValidator] = None,
        dlq_manager: Optional[QuarantineDLQManager] = None,
    ):
        self.auto_decode_tcvn3 = auto_decode_tcvn3
        self.contract_validator = contract_validator
        self.dlq_manager = dlq_manager or (contract_validator.dlq_manager if contract_validator else None)

    def load_file(self, file_path: str | Path, doc_id: Optional[str] = None) -> LoadedDocument:
        """Nạp và trích xuất nội dung từ một tệp tin duy nhất."""
        path = Path(file_path).resolve()
        if not path.exists():
            raise FileNotFoundError(f"Không tìm thấy tệp tài liệu: {path}")

        ext = path.suffix.lower()
        if ext not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(f"Định dạng tệp không được hỗ trợ: '{ext}'. Danh mục hỗ trợ: {self.SUPPORTED_EXTENSIONS}")

        filename = path.name
        doc_id = doc_id or f"doc_{hashlib.md5(filename.encode('utf-8')).hexdigest()[:8]}"

        # Trích xuất theo định dạng
        if ext == ".pdf":
            content, meta = self._load_pdf(path)
        elif ext == ".docx":
            content, meta = self._load_docx(path)
        elif ext == ".xlsx":
            content, meta = self._load_xlsx(path)
        elif ext in {".html", ".htm"}:
            content, meta = self._load_html(path)
        elif ext in {".md", ".txt"}:
            content, meta = self._load_text(path, ext)
        else:
            content, meta = "", {}

        # Tự động giải mã TCVN3 nếu cần
        if self.auto_decode_tcvn3 and is_tcvn3(content):
            content = decode_tcvn3(content)
            meta["tcvn3_decoded"] = True

        # Chuẩn hóa Unicode NFC và làm sạch ký tự tàng hình zero-width
        content = IngestionSanitizer.normalize_vietnamese_nfc(content)

        # Thẩm định Data Contract & Quarantine DLQ nếu có cấu hình
        is_valid = True
        quarantine_id = None
        if self.contract_validator:
            payload = {
                "doc_id": doc_id,
                "filename": filename,
                "raw_content": content,
            }
            approved, qid = self.contract_validator.process_and_filter(payload)
            is_valid = approved
            quarantine_id = qid

        doc = LoadedDocument(
            doc_id=doc_id,
            filename=filename,
            file_path=str(path),
            file_type=ext.lstrip("."),
            content=content,
            raw_content=content,
            metadata=meta,
            is_valid=is_valid,
            quarantine_id=quarantine_id,
        )
        return doc

    def load_directory(
        self,
        dir_path: str | Path,
        recursive: bool = False,
        extensions: Optional[List[str]] = None,
    ) -> List[LoadedDocument]:
        """Tự động duyệt và nạp toàn bộ tệp tài liệu hợp lệ trong thư mục."""
        folder = Path(dir_path).resolve()
        if not folder.exists() or not folder.is_dir():
            raise NotADirectoryError(f"Thư mục không tồn tại: {folder}")

        target_exts = set(extensions) if extensions else self.SUPPORTED_EXTENSIONS
        pattern = "**/*" if recursive else "*"
        all_files = sorted([f for f in folder.glob(pattern) if f.is_file() and f.suffix.lower() in target_exts])

        documents: List[LoadedDocument] = []
        for f in all_files:
            try:
                doc = self.load_file(f)
                documents.append(doc)
            except Exception as e:
                logger.error("Lỗi khi nạp tài liệu %s: %s", f.name, str(e))
        return documents

    def _load_pdf(self, path: Path) -> Tuple[str, Dict[str, Any]]:
        """Trích xuất PDF bằng PyMuPDF (ưu tiên) hoặc pypdf fallback, nhận diện bảng biểu."""
        meta: Dict[str, Any] = {"extractor": "pymupdf", "pages": 0, "table_count": 0, "is_image_only": False}

        # 1. Thử dùng PyMuPDF (fitz)
        try:
            import pymupdf

            doc = pymupdf.open(path)
            meta["pages"] = len(doc)
            page_contents: List[str] = []
            total_tables = 0

            for page_idx in range(len(doc)):
                page = doc[page_idx]
                page_num = page_idx + 1
                page_lines: List[str] = [f"[Trang {page_num}]"]

                # Phát hiện bảng biểu bằng page.find_tables()
                tables = []
                try:
                    tabs = page.find_tables()
                    tables = list(tabs) if tabs else []
                except Exception:
                    tables = []

                if tables:
                    total_tables += len(tables)
                    for tab in tables:
                        raw_matrix = tab.extract()
                        md_table = matrix_to_markdown_table(raw_matrix)
                        if md_table:
                            page_lines.append(f"\n{md_table}\n")

                # Trích xuất các span văn bản và nhận diện font/cỡ chữ
                text_dict = page.get_text("dict")
                blocks = text_dict.get("blocks", [])
                for b in blocks:
                    if b.get("type") != 0:
                        continue
                    for line in b.get("lines", []):
                        line_text = ""
                        max_sz = 0.0
                        is_bold = False
                        font_names = []
                        for s in line.get("spans", []):
                            txt = s.get("text", "")
                            if not txt:
                                continue
                            sz = float(s.get("size", 10.0))
                            max_sz = max(max_sz, sz)
                            font = s.get("font", "").lower()
                            font_names.append(font)
                            if "bold" in font or (s.get("flags", 0) & 2 != 0):
                                is_bold = True
                            line_text += txt

                        st = line_text.strip()
                        if not st:
                            continue

                        # Kiểm tra font TCVN3 trong PDF
                        if any("vn" in fn for fn in font_names) or is_tcvn3(st):
                            st = decode_tcvn3(st)

                        # Nhận diện cấp bậc tiêu đề dựa trên cỡ chữ
                        if max_sz >= 20.0 or (is_bold and max_sz >= 16.0):
                            page_lines.append(f"\n# {st}\n")
                        elif is_bold and max_sz >= 13.5:
                            page_lines.append(f"\n## {st}\n")
                        elif (is_bold and max_sz >= 11.5) or re.match(r"^(CHƯƠNG|PHẦN|ĐIỀU|\d+\.)\s+", st, re.IGNORECASE):
                            page_lines.append(f"\n### {st}\n")
                        elif st.startswith("•") or st.startswith("- ") or st.startswith("–"):
                            page_lines.append(f"- {re.sub(r'^[•–\-]\s*', '', st)}")
                        else:
                            page_lines.append(st)

                page_contents.append("\n".join(page_lines))

            full_text = "\n\n".join(page_contents).strip()
            meta["table_count"] = total_tables

            # Cảnh báo tệp scan ảnh thuần túy
            clean_probe = re.sub(r"\[Trang \d+\]", "", full_text).strip()
            if len(clean_probe) < 15:
                meta["is_image_only"] = True
                logger.warning("⚠️ Cảnh báo: Tệp '%s' là PDF scan ảnh thuần túy (image-only), không có text layer (cần OCR).", path.name)

            return full_text, meta

        except ImportError:
            pass

        # 2. Fallback sang pypdf
        try:
            from pypdf import PdfReader

            reader = PdfReader(path)
            meta["extractor"] = "pypdf"
            meta["pages"] = len(reader.pages)
            pages = [f"[Trang {i+1}]\n" + (p.extract_text() or "") for i, p in enumerate(reader.pages)]
            full_text = "\n\n".join(pages).strip()
            if len(re.sub(r"\[Trang \d+\]", "", full_text).strip()) < 15:
                meta["is_image_only"] = True
                logger.warning("⚠️ Cảnh báo: Tệp '%s' là PDF scan ảnh thuần túy (image-only), không có text layer (cần OCR).", path.name)
            return full_text, meta
        except Exception as e:
            logger.error("Không thể đọc tệp PDF %s: %s", path.name, str(e))
            return "", meta

    def _load_docx(self, path: Path) -> Tuple[str, Dict[str, Any]]:
        """Trích xuất tệp DOCX bảo toàn phân cấp Heading và chuyển đổi bảng sang Markdown Table."""
        import docx

        doc = docx.Document(path)
        meta: Dict[str, Any] = {"extractor": "python-docx", "paragraph_count": len(doc.paragraphs), "table_count": len(doc.tables)}

        content_parts: List[str] = []
        # Duyệt tuần tự các phần tử trong thân văn bản để giữ đúng thứ tự xuất hiện
        for child in doc.element.body:
            tag = child.tag.split("}")[-1]
            if tag == "p":
                p = docx.text.paragraph.Paragraph(child, doc)
                text = p.text.strip()
                if not text:
                    continue

                style_name = p.style.name.lower() if p.style and p.style.name else ""

                # Giải mã TCVN3 nếu phát hiện font .VnTime hoặc ký tự TCVN3
                if is_tcvn3(text):
                    text = decode_tcvn3(text)

                # Chuyển đổi Style sang Markdown Heading
                if "heading 1" in style_name:
                    content_parts.append(f"\n# {text}\n")
                elif "heading 2" in style_name:
                    content_parts.append(f"\n## {text}\n")
                elif "heading 3" in style_name:
                    content_parts.append(f"\n### {text}\n")
                elif "list" in style_name or "bullet" in style_name:
                    content_parts.append(f"- {text}")
                else:
                    content_parts.append(text)

            elif tag == "tbl":
                tbl = docx.table.Table(child, doc)
                matrix = []
                for row in tbl.rows:
                    row_data = []
                    for cell in row.cells:
                        c_text = cell.text.strip()
                        if is_tcvn3(c_text):
                            c_text = decode_tcvn3(c_text)
                        row_data.append(c_text)
                    matrix.append(row_data)

                md_table = matrix_to_markdown_table(matrix)
                if md_table:
                    content_parts.append(f"\n{md_table}\n")

        return "\n".join(content_parts).strip(), meta

    def _load_xlsx(self, path: Path) -> Tuple[str, Dict[str, Any]]:
        """Trích xuất bảng tính Excel (.xlsx) sang định dạng bảng biểu Markdown."""
        import openpyxl

        wb = openpyxl.load_workbook(path, data_only=True)
        meta: Dict[str, Any] = {"extractor": "openpyxl", "sheet_names": wb.sheetnames, "table_count": len(wb.sheetnames)}

        sheet_parts: List[str] = []
        for name in wb.sheetnames:
            ws = wb[name]
            rows = list(ws.iter_rows(values_only=True))
            # Lọc bỏ các hàng rỗng hoàn toàn
            valid_rows = []
            for r in rows:
                if any(c is not None and str(c).strip() != "" for c in r):
                    row_vals = []
                    for c in r:
                        val_str = str(c) if c is not None else ""
                        if is_tcvn3(val_str):
                            val_str = decode_tcvn3(val_str)
                        row_vals.append(val_str)
                    valid_rows.append(row_vals)

            if valid_rows:
                table_md = matrix_to_markdown_table(valid_rows)
                sheet_parts.append(f"### Sheet: {name}\n\n{table_md}")

        return "\n\n".join(sheet_parts).strip(), meta

    def _load_html(self, path: Path) -> Tuple[str, Dict[str, Any]]:
        """Trích xuất tệp HTML bảo toàn cấu trúc phân cấp và bảng dữ liệu."""
        from bs4 import BeautifulSoup

        with open(path, "r", encoding="utf-8", errors="replace") as f:
            raw_html = f.read()

        soup = BeautifulSoup(raw_html, "html.parser")
        meta: Dict[str, Any] = {"extractor": "beautifulsoup4", "title": soup.title.string if soup.title else ""}

        # Loại bỏ các thẻ script, style, head
        for tag in soup(["script", "style", "meta", "noscript", "link"]):
            tag.extract()

        content_parts: List[str] = []

        # Xử lý các thẻ tiêu đề và bảng
        for elem in soup.find_all(["h1", "h2", "h3", "h4", "p", "table", "ul", "ol"]):
            name = elem.name
            if name == "h1":
                content_parts.append(f"\n# {elem.get_text().strip()}\n")
            elif name == "h2":
                content_parts.append(f"\n## {elem.get_text().strip()}\n")
            elif name == "h3":
                content_parts.append(f"\n### {elem.get_text().strip()}\n")
            elif name == "h4":
                content_parts.append(f"\n#### {elem.get_text().strip()}\n")
            elif name in {"ul", "ol"}:
                for li in elem.find_all("li"):
                    content_parts.append(f"- {li.get_text().strip()}")
            elif name == "p":
                txt = elem.get_text().strip()
                if txt:
                    content_parts.append(txt)
            elif name == "table":
                matrix = []
                for tr in elem.find_all("tr"):
                    cells = tr.find_all(["th", "td"])
                    matrix.append([c.get_text().strip() for c in cells])
                table_md = matrix_to_markdown_table(matrix)
                if table_md:
                    content_parts.append(f"\n{table_md}\n")

        full_text = "\n".join(content_parts).strip()
        if not full_text:
            full_text = soup.get_text(separator="\n").strip()

        return full_text, meta

    def _load_text(self, path: Path, ext: str) -> Tuple[str, Dict[str, Any]]:
        """Đọc tệp văn bản thuần hoặc Markdown (.md, .txt)."""
        content = ""
        for encoding in ["utf-8", "cp1258", "latin-1"]:
            try:
                with open(path, "r", encoding=encoding) as f:
                    content = f.read()
                break
            except UnicodeDecodeError:
                continue

        meta: Dict[str, Any] = {"extractor": "native_text", "file_size": len(content)}
        return content, meta
