"""FinOps Telemetry Ledger with Prompt Caching Accounting & Strategy Planner.

Complies with Section 6 of CODEX_MEMORY_CONTEXT_CACHING.md and Chapter 9 of Enterprise Architecture:
- Enforces Decimal arithmetic for financial accounting accuracy.
- Parses and accounts for cached prompt tokens (50%-75% discount).
- Evaluates Warm vs. Compact vs. Switch strategies (CacheCostPlanner).
"""

from __future__ import annotations

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
    cached_prompt_tokens: int = 0
    completion_tokens: int
    total_tokens: int
    total_cost_usd: Decimal
    timestamp: float = Field(default_factory=time.time)


class CacheCostPlanner:
    """
    Evaluates Warm vs. Compact vs. Switch strategies as specified in Section 6.4 - 6.5
    of CODEX_MEMORY_CONTEXT_CACHING.md.
    """

    @staticmethod
    def calculate_warm_cost(
        cached_tokens: int,
        fresh_input_tokens: int,
        output_tokens: int,
        price_input_per_million: Decimal = Decimal("5.0"),
        price_cached_per_million: Decimal = Decimal("0.5"),
        price_output_per_million: Decimal = Decimal("20.0"),
    ) -> Decimal:
        """
        Calculates Model A warm cost:
        cost = (cached * p_cached + fresh * p_input + output * p_output) / 1_000_000
        Matches Section 6.4: 50k cached ($0.5/1M) + 2k fresh ($5/1M) + 1k output ($20/1M) = $0.055
        """
        cached_cost = (Decimal(str(cached_tokens)) * price_cached_per_million) / Decimal("1000000")
        fresh_cost = (Decimal(str(fresh_input_tokens)) * price_input_per_million) / Decimal("1000000")
        output_cost = (Decimal(str(output_tokens)) * price_output_per_million) / Decimal("1000000")
        return cached_cost + fresh_cost + output_cost

    @staticmethod
    def calculate_cold_cost(
        total_input_tokens: int,
        output_tokens: int,
        price_input_per_million: Decimal = Decimal("1.0"),
        price_output_per_million: Decimal = Decimal("5.0"),
    ) -> Decimal:
        """
        Calculates Model B cold cost:
        cost = (total_input * p_input + output * p_output) / 1_000_000
        Matches Section 6.4: 52k input ($1/1M) + 1k output ($5/1M) = $0.057
        """
        input_cost = (Decimal(str(total_input_tokens)) * price_input_per_million) / Decimal("1000000")
        output_cost = (Decimal(str(output_tokens)) * price_output_per_million) / Decimal("1000000")
        return input_cost + output_cost

    @staticmethod
    def should_keep_alive(
        p_revisit: float,
        cost_cold_next: Decimal,
        cost_warm_next: Decimal,
        keep_alive_cost: Decimal,
    ) -> bool:
        """
        Keep-alive break-even formula (Section 6.5):
        expectedSavings = P(nextRequest) * (costColdNext - costWarmNext)
        keepAliveWorthTrying = expectedSavings > keep_alive_cost
        """
        expected_savings = Decimal(str(p_revisit)) * (cost_cold_next - cost_warm_next)
        return expected_savings > keep_alive_cost


class FinOpsLedger:
    """
    FinOps Telemetry Ledger calculating token expenditure with prompt caching discount.
    Enforces Decimal arithmetic for financial accounting accuracy.
    """

    DEFAULT_PRICING: Dict[str, Dict[str, Decimal]] = {
        "gpt-4o-mini": {
            "input": Decimal("0.00015"),
            "cached_input": Decimal("0.000075"),  # 50% discount for cached prompt tokens
            "output": Decimal("0.00060"),
        },
        "gemini-1.5-flash": {
            "input": Decimal("0.000075"),
            "cached_input": Decimal("0.00001875"),  # 75% discount
            "output": Decimal("0.00030"),
        },
        "default": {
            "input": Decimal("0.00010"),
            "cached_input": Decimal("0.00005"),
            "output": Decimal("0.00040"),
        },
    }

    def __init__(self, db_path: str = ":memory:") -> None:
        self.db_path = db_path
        self._mem_conn = (
            sqlite3.connect(":memory:", check_same_thread=False)
            if db_path == ":memory:"
            else None
        )
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        if self._mem_conn:
            return self._mem_conn
        return sqlite3.connect(self.db_path, check_same_thread=False)

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
                cached_prompt_tokens INTEGER DEFAULT 0,
                completion_tokens INTEGER NOT NULL,
                total_tokens INTEGER NOT NULL,
                cost_usd TEXT NOT NULL,
                timestamp REAL NOT NULL
            )
        """)
        # Backward compatibility column check
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(finops_ledger)")
        columns = [row[1] for row in cursor.fetchall()]
        if "cached_prompt_tokens" not in columns:
            cursor.execute("ALTER TABLE finops_ledger ADD COLUMN cached_prompt_tokens INTEGER DEFAULT 0")
        conn.commit()
        if not self._mem_conn:
            conn.close()

    def calculate_cost(
        self,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        cached_prompt_tokens: int = 0,
    ) -> Decimal:
        """
        Calculates token cost with 50%-75% discount applied to cached prompt tokens.
        """
        pricing = self.DEFAULT_PRICING.get(model, self.DEFAULT_PRICING["default"])
        input_rate = pricing["input"]
        cached_rate = pricing.get("cached_input", input_rate / Decimal("2"))
        output_rate = pricing["output"]

        cached_tokens = max(0, min(cached_prompt_tokens, prompt_tokens))
        uncached_tokens = max(0, prompt_tokens - cached_tokens)

        input_cost = (Decimal(str(uncached_tokens)) / Decimal("1000")) * input_rate
        cached_cost = (Decimal(str(cached_tokens)) / Decimal("1000")) * cached_rate
        output_cost = (Decimal(str(completion_tokens)) / Decimal("1000")) * output_rate
        return input_cost + cached_cost + output_cost

    def record_usage(
        self,
        thread_id: str,
        run_id: str,
        model: str,
        provider: str,
        usage: Usage,
    ) -> FinOpsRecord:
        cached_tokens = getattr(usage, "cached_prompt_tokens", 0)
        cost = self.calculate_cost(
            model=model,
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            cached_prompt_tokens=cached_tokens,
        )
        now = time.time()

        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO finops_ledger (
                    thread_id, run_id, model, provider, prompt_tokens,
                    cached_prompt_tokens, completion_tokens, total_tokens, cost_usd, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                thread_id,
                run_id,
                model,
                provider,
                usage.prompt_tokens,
                cached_tokens,
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
            cached_prompt_tokens=cached_tokens,
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
                    SUM(cached_prompt_tokens),
                    SUM(completion_tokens)
                FROM finops_ledger
            """)
            row = cursor.fetchone()
            total_calls = row[0] or 0
            total_tokens = row[1] or 0
            prompt_tokens = row[2] or 0
            cached_prompt_tokens = row[3] or 0
            comp_tokens = row[4] or 0

            cursor.execute("SELECT cost_usd FROM finops_ledger")
            cost_rows = cursor.fetchall()
            total_cost = sum((Decimal(r[0]) for r in cost_rows), Decimal("0.0"))

            return {
                "total_calls": total_calls,
                "total_tokens": total_tokens,
                "prompt_tokens": prompt_tokens,
                "cached_prompt_tokens": cached_prompt_tokens,
                "completion_tokens": comp_tokens,
                "total_cost_usd": str(total_cost),
            }
