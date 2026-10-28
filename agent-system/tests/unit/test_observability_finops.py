from decimal import Decimal
import pytest
from agent_platform.llm.base import Usage
from agent_platform.harness.observability.finops import FinOpsLedger, CacheCostPlanner

def test_finops_decimal_cost_calculation():
    ledger = FinOpsLedger(db_path=":memory:")

    # 2000 prompt tokens, 500 completion tokens on gpt-4o-mini
    # Input: 2 * 0.00015 = 0.000300
    # Output: 0.5 * 0.00060 = 0.000300
    # Total: 0.000600
    cost = ledger.calculate_cost("gpt-4o-mini", prompt_tokens=2000, completion_tokens=500)
    assert isinstance(cost, Decimal)
    assert cost == Decimal("0.000600")

def test_finops_cached_prompt_tokens_discount():
    ledger = FinOpsLedger(db_path=":memory:")

    # 2000 total prompt tokens, of which 1000 are cached (50% discount)
    # Fresh prompt: 1000 * 0.00015 / 1000 = 0.000150
    # Cached prompt: 1000 * 0.000075 / 1000 = 0.000075
    # Completion: 500 * 0.00060 / 1000 = 0.000300
    # Total: 0.000525
    cost = ledger.calculate_cost(
        "gpt-4o-mini",
        prompt_tokens=2000,
        completion_tokens=500,
        cached_prompt_tokens=1000,
    )
    assert isinstance(cost, Decimal)
    assert cost == Decimal("0.000525")
    # Verify savings compared to cold call (0.000600 - 0.000525 = 0.000075)
    cold_cost = ledger.calculate_cost("gpt-4o-mini", prompt_tokens=2000, completion_tokens=500)
    assert cold_cost - cost == Decimal("0.000075")

def test_finops_gemini_75_percent_cached_tokens_discount():
    ledger = FinOpsLedger(db_path=":memory:")

    # gemini-1.5-flash: fresh input = $0.000075 / 1k, cached = $0.00001875 / 1k (75% off)
    # 4000 prompt tokens, 2000 cached, 1000 completion ($0.00030 / 1k)
    # Fresh input: 2000 * 0.000075 / 1000 = 0.00015000
    # Cached input: 2000 * 0.00001875 / 1000 = 0.00003750
    # Output: 1000 * 0.00030 / 1000 = 0.00030000
    # Total: 0.00048750
    cost = ledger.calculate_cost(
        "gemini-1.5-flash",
        prompt_tokens=4000,
        completion_tokens=1000,
        cached_prompt_tokens=2000,
    )
    assert isinstance(cost, Decimal)
    assert cost == Decimal("0.00048750")

def test_cache_cost_planner_warm_vs_cold_section_6_4():
    """
    Verifies Section 6.4 of CODEX_MEMORY_CONTEXT_CACHING.md:
    Model A warm: 50k cached ($0.5/1M) + 2k fresh ($5/1M) + 1k output ($20/1M) = $0.055
    Model B cold: 52k input ($1/1M) + 1k output ($5/1M) = $0.057
    Warm Model A is cheaper than Cold Model B ($0.055 < $0.057).
    """
    warm_cost = CacheCostPlanner.calculate_warm_cost(
        cached_tokens=50_000,
        fresh_input_tokens=2_000,
        output_tokens=1_000,
    )
    cold_cost = CacheCostPlanner.calculate_cold_cost(
        total_input_tokens=52_000,
        output_tokens=1_000,
    )
    assert warm_cost == Decimal("0.055")
    assert cold_cost == Decimal("0.057")
    assert warm_cost < cold_cost

def test_cache_cost_planner_keep_alive_decision_section_6_5():
    """
    Verifies Section 6.5 keep-alive formula:
    expectedSavings = P(nextRequest) * (costColdNext - costWarmNext)
    keepAliveWorthTrying = expectedSavings > keep_alive_cost
    """
    cold_cost = Decimal("0.057")
    warm_cost = Decimal("0.055")
    diff = cold_cost - warm_cost  # $0.002

    # High probability of next request (p=0.8): expected savings = 0.0016
    # If keep-alive cost is 0.001 -> worth trying
    should_keep = CacheCostPlanner.should_keep_alive(
        p_revisit=0.8,
        cost_cold_next=cold_cost,
        cost_warm_next=warm_cost,
        keep_alive_cost=Decimal("0.001"),
    )
    assert should_keep is True

    # Low probability of next request (p=0.2): expected savings = 0.0004
    # If keep-alive cost is 0.001 -> NOT worth trying
    should_keep_low = CacheCostPlanner.should_keep_alive(
        p_revisit=0.2,
        cost_cold_next=cold_cost,
        cost_warm_next=warm_cost,
        keep_alive_cost=Decimal("0.001"),
    )
    assert should_keep_low is False

def test_finops_ledger_recording_and_summary():
    ledger = FinOpsLedger(db_path=":memory:")

    usage1 = Usage(
        prompt_tokens=1000,
        completion_tokens=500,
        total_tokens=1500,
        cached_prompt_tokens=500,
    )
    rec1 = ledger.record_usage(
        thread_id="th_1",
        run_id="run_1",
        model="gpt-4o-mini",
        provider="openai_compat",
        usage=usage1,
    )
    assert rec1.total_tokens == 1500
    assert rec1.cached_prompt_tokens == 500
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
    assert summary["cached_prompt_tokens"] == 500
    assert Decimal(summary["total_cost_usd"]) > Decimal("0.0")
