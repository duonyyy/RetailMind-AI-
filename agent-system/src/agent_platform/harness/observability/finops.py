import sqlite3
import time
from decimal import Decimal
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from agent_platform.llm.base import Usage

class FinOpsRecord(BaseModel):
    thread_id: str
    run_id: str
    model: str
    provider: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    total_cost_usd: Decimal
    timestamp: float = Field(default_factory=time.time)

class FinOpsLedger:
    """
    FinOps Telemetry Ledger calculating token expenditure from actual provider usage (Fixes A16).
    Enforces Decimal arithmetic for financial accounting accuracy.
    """

    DEFAULT_PRICING: Dict[str, Dict[str, Decimal]] = {
        "gpt-4o-mini": {
            "input": Decimal("0.00015"),
            "output": Decimal("0.00060"),
        },
        "gemini-1.5-flash": {
            "input": Decimal("0.000075"),
            "output": Decimal("0.00030"),
        },
        "default": {
            "input": Decimal("0.00010"),
            "output": Decimal("0.00040"),
        },
    }

    def __init__(self, db_path: str = ":memory:") -> None:
        self.db_path = db_path
        self._mem_conn = sqlite3.connect(":memory:") if db_path == ":memory:" else None
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        if self._mem_conn:
            return self._mem_conn
        return sqlite3.connect(self.db_path)

    def _init_db(self) -> None:
        conn = self._get_conn()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS finops_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id TEXT NOT NULL,
                run_id TEXT NOT NULL,
                model TEXT NOT NULL,
                provider TEXT NOT NULL,
                prompt_tokens INTEGER NOT NULL,
                completion_tokens INTEGER NOT NULL,
                total_tokens INTEGER NOT NULL,
                cost_usd TEXT NOT NULL,
                timestamp REAL NOT NULL
            )
        """)
        conn.commit()
        if not self._mem_conn:
            conn.close()

    def calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> Decimal:
        pricing = self.DEFAULT_PRICING.get(model, self.DEFAULT_PRICING["default"])
        input_rate = pricing["input"]
        output_rate = pricing["output"]

        input_cost = (Decimal(str(prompt_tokens)) / Decimal("1000")) * input_rate
        output_cost = (Decimal(str(completion_tokens)) / Decimal("1000")) * output_rate
        return input_cost + output_cost

    def record_usage(
        self,
        thread_id: str,
        run_id: str,
        model: str,
        provider: str,
        usage: Usage,
    ) -> FinOpsRecord:
        cost = self.calculate_cost(model, usage.prompt_tokens, usage.completion_tokens)
        now = time.time()

        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO finops_ledger (
                    thread_id, run_id, model, provider, prompt_tokens,
                    completion_tokens, total_tokens, cost_usd, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                thread_id,
                run_id,
                model,
                provider,
                usage.prompt_tokens,
                usage.completion_tokens,
                usage.total_tokens,
                str(cost),
                now,
            ))
            conn.commit()

        return FinOpsRecord(
            thread_id=thread_id,
            run_id=run_id,
            model=model,
            provider=provider,
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens,
            total_cost_usd=cost,
            timestamp=now,
        )

    def get_summary(self) -> Dict[str, Any]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COUNT(*), 
                    SUM(total_tokens),
                    SUM(prompt_tokens),
                    SUM(completion_tokens)
                FROM finops_ledger
            """)
            row = cursor.fetchone()
            total_calls = row[0] or 0
            total_tokens = row[1] or 0
            prompt_tokens = row[2] or 0
            comp_tokens = row[3] or 0

            cursor.execute("SELECT cost_usd FROM finops_ledger")
            cost_rows = cursor.fetchall()
            total_cost = sum((Decimal(r[0]) for r in cost_rows), Decimal("0.0"))

            return {
                "total_calls": total_calls,
                "total_tokens": total_tokens,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": comp_tokens,
                "total_cost_usd": str(total_cost),
            }
