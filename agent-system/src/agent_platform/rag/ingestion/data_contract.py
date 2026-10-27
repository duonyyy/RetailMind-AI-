"""Data Contracts & Quarantine Dead-Letter Queue (DLQ) Engine for Lakehouse Ingestion.

Complies with Section 3.4 & Section 13.1 of Enterprise Data Infra & LLMOps Architecture:
- Enforces strict Pydantic/YAML Data Contract constraints on inbound document payloads.
- Routes violating or corrupted payloads to a DuckDB Quarantine Dead-Letter Queue (DLQ).
- Guarantees the Medallion Bronze layer is never polluted by malformed or dangerous data.
"""

from __future__ import annotations

import os
import uuid
import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import duckdb


class DataContractRule(BaseModel):
    """Configurable schema constraints for document ingestion."""
    min_content_length: int = 15
    max_content_length: int = 1_000_000
    required_fields: List[str] = Field(default_factory=lambda: ["doc_id", "filename", "raw_content"])
    allowed_extensions: List[str] = Field(
        default_factory=lambda: [".md", ".txt", ".json", ".pdf", ".docx", ".csv"]
    )
    disallowed_keywords: List[str] = Field(
        default_factory=lambda: ["<script>", "DROP TABLE", "rm -rf", ":(){ :|:& };:"]
    )


class ContractValidationResult(BaseModel):
    """Outcome of evaluating an inbound payload against Data Contracts."""
    is_valid: bool
    violations: List[str] = Field(default_factory=list)


class QuarantineDLQManager:
    """Manages the DuckDB Quarantine Dead-Letter Queue for corrupted or contract-violating records."""

    def __init__(self, con: Optional[duckdb.DuckDBPyConnection] = None):
        self.con = con or duckdb.connect(database=":memory:")
        self._init_quarantine_table()

    def _init_quarantine_table(self) -> None:
        """Create the Quarantine DLQ table in DuckDB."""
        self.con.execute("""
            CREATE TABLE IF NOT EXISTS quarantine_dead_letter_queue (
                quarantine_id VARCHAR PRIMARY KEY,
                doc_id VARCHAR,
                filename VARCHAR,
                payload_preview TEXT,
                violations TEXT,
                quarantined_at TIMESTAMP
            );
        """)

    def quarantine_record(
        self,
        doc_id: str,
        filename: str,
        raw_content: str,
        violations: List[str]
    ) -> str:
        """Insert contract-violating record into the DLQ table."""
        qid = f"dlq_{uuid.uuid4().hex[:10]}"
        preview = (raw_content[:200] + "...") if len(raw_content) > 200 else raw_content
        violations_str = " | ".join(violations)
        now = datetime.datetime.now(datetime.timezone.utc)

        self.con.execute("""
            INSERT OR REPLACE INTO quarantine_dead_letter_queue
            VALUES (?, ?, ?, ?, ?, ?)
        """, [qid, doc_id, filename, preview, violations_str, now])

        return qid

    def list_quarantined_records(self) -> List[Dict[str, Any]]:
        """Retrieve all quarantined records for data quality review."""
        cursor = self.con.execute("""
            SELECT quarantine_id, doc_id, filename, payload_preview, violations, quarantined_at
            FROM quarantine_dead_letter_queue
            ORDER BY quarantined_at DESC
        """)
        cols = [desc[0] for desc in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]

    def count_quarantined(self) -> int:
        """Return total number of quarantined items."""
        res = self.con.execute("SELECT count(*) FROM quarantine_dead_letter_queue").fetchone()
        return res[0] if res else 0


class DataContractValidator:
    """Enforces Data Contracts on incoming documents with automated DLQ quarantine routing."""

    def __init__(
        self,
        rules: Optional[DataContractRule] = None,
        dlq_manager: Optional[QuarantineDLQManager] = None
    ):
        self.rules = rules or DataContractRule()
        self.dlq_manager = dlq_manager or QuarantineDLQManager()

    def validate_payload(self, doc: Dict[str, Any]) -> ContractValidationResult:
        """Evaluate doc dictionary against active Data Contract rules."""
        violations: List[str] = []

        # 1. Required fields check
        for req in self.rules.required_fields:
            if req not in doc or doc[req] is None or str(doc[req]).strip() == "":
                violations.append(f"Thiếu trường bắt buộc hoặc trường rỗng: '{req}'")

        if violations:
            return ContractValidationResult(is_valid=False, violations=violations)

        content = str(doc.get("raw_content", ""))
        filename = str(doc.get("filename", ""))

        # 2. Content length bounds
        if len(content) < self.rules.min_content_length:
            violations.append(
                f"Độ dài nội dung ({len(content)} ký tự) nhỏ hơn mức tối thiểu cho phép ({self.rules.min_content_length})"
            )
        if len(content) > self.rules.max_content_length:
            violations.append(
                f"Độ dài nội dung ({len(content)} ký tự) vượt quá mức trần tối đa ({self.rules.max_content_length})"
            )

        # 3. File extension verification
        _, ext = os.path.splitext(filename.lower())
        if ext and ext not in self.rules.allowed_extensions:
            violations.append(f"Định dạng tệp '{ext}' không nằm trong danh mục được phê duyệt: {self.rules.allowed_extensions}")

        # 4. Dangerous pattern check
        for pattern in self.rules.disallowed_keywords:
            if pattern.lower() in content.lower():
                violations.append(f"Phát hiện từ khóa nguy hiểm bị cấm trong tài liệu: '{pattern}'")

        return ContractValidationResult(
            is_valid=(len(violations) == 0),
            violations=violations
        )

    def process_and_filter(
        self,
        doc: Dict[str, Any]
    ) -> tuple[bool, Optional[str]]:
        """Validate payload. If invalid, automatically route to DLQ.
        
        Returns:
            (is_approved, dlq_id_if_quarantined)
        """
        validation = self.validate_payload(doc)
        if validation.is_valid:
            return True, None

        # Route to DLQ
        qid = self.dlq_manager.quarantine_record(
            doc_id=str(doc.get("doc_id", "unknown")),
            filename=str(doc.get("filename", "unknown")),
            raw_content=str(doc.get("raw_content", "")),
            violations=validation.violations
        )
        return False, qid


# Alias for Enterprise Architecture alignment
DataContractVerifier = DataContractValidator

