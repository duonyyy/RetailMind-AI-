from decimal import Decimal
import pytest
from agent_platform.llm.base import Usage
from agent_platform.harness.observability.finops import FinOpsLedger

def test_finops_decimal_cost_calculation():
    ledger = FinOpsLedger(db_path=":memory:")

    # 2000 prompt tokens, 500 completion tokens on gpt-4o-mini
    # Input: 2 * 0.00015 = 0.000300
    # Output: 0.5 * 0.00060 = 0.000300
    # Total: 0.000600
    cost = ledger.calculate_cost("gpt-4o-mini", prompt_tokens=2000, completion_tokens=500)
    assert isinstance(cost, Decimal)
    assert cost == Decimal("0.000600")

def test_finops_ledger_recording_and_summary():
    ledger = FinOpsLedger(db_path=":memory:")

    usage1 = Usage(prompt_tokens=1000, completion_tokens=500, total_tokens=1500)
    rec1 = ledger.record_usage(
        thread_id="th_1",
        run_id="run_1",
        model="gpt-4o-mini",
        provider="openai_compat",
        usage=usage1,
    )
    assert rec1.total_tokens == 1500
    assert rec1.total_cost_usd > Decimal("0.0")

    usage2 = Usage(prompt_tokens=3000, completion_tokens=1000, total_tokens=4000)
    ledger.record_usage(
        thread_id="th_2",
        run_id="run_2",
        model="gpt-4o-mini",
        provider="openai_compat",
        usage=usage2,
    )

    summary = ledger.get_summary()
    assert summary["total_calls"] == 2
    assert summary["total_tokens"] == 5500
    assert summary["prompt_tokens"] == 4000
    assert summary["completion_tokens"] == 1500
    assert Decimal(summary["total_cost_usd"]) > Decimal("0.0")
