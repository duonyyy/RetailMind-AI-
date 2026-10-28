"""Comprehensive Unit Tests for Enterprise 4-Tier Memory Substrate.

Verifies:
1. ShortTermMemory Compaction & Durable Notes Extraction
2. ContextBudgetManager 10/4/3/3 Rule & Head-Preserving Trimming
3. Memory Intent Router (Reduction of Redundant Queries)
4. Long-Term Declarative Memory & 'Recency Wins' Conflict Resolution
5. Episodic Trajectory Retrieval with Ebbinghaus Decay
6. Decree 13/2023/ND-CP Privacy Guard & Right-to-be-Forgotten
7. End-to-End retrieve_merged_context Assembly
"""

import time
import pytest
from agent_platform.harness.memory import (
    EnterpriseMemoryManager,
    ShortTermMemory,
    ContextBudgetManager,
    LayerBudget,
    route_memory_query,
    MemoryPrivacyGuard,
    DurableFact,
    FactValidity,
    EpisodicTrajectory,
)


def test_short_term_compaction_and_durable_notes():
    """Verifies that under message pressure, short-term memory compacts and preserves critical constraints."""
    stm = ShortTermMemory(strategy="sliding", max_recent_messages=4, pressure_tokens=500)

    # 1. Add dialogue with durable customer constraint and SKU
    stm.add("user", "Chào bạn, tôi cần mua laptop Asus Vivobook 15 mã LAP-ASUS-VIVO15.")
    stm.add("assistant", "Dạ mẫu Vivobook 15 hiện có giá 17.990.000đ ạ.")
    stm.add("user", "Yêu cầu bắt buộc là ngân sách dưới 20 triệu và không được quên xuất hóa đơn VAT.")
    stm.add("assistant", "Dạ em đã ghi nhận yêu cầu ngân sách dưới 20 triệu và xuất hóa đơn VAT.")

    assert len(stm.messages) == 4
    assert stm.compactions == 0

    # 2. Add 5th message triggering compaction
    stm.add("user", "Bảo hành mấy năm vậy bạn?")
    assert stm.compactions >= 1
    assert len(stm.messages) <= 4

    # 3. Verify durable note was extracted and retained
    rendered = stm.render()
    assert "<DURABLE_NOTES>" in rendered
    assert "bắt buộc" in rendered or "LAP-ASUS-VIVO15" in rendered
    assert "<RECENT_TURNS>" in rendered
    assert "Bảo hành mấy năm vậy bạn?" in rendered


def test_context_budget_manager_10_4_3_3_rule():
    """Verifies that token budget trims excess text and emits structured XML blocks."""
    # 1000 tokens total: short_term=100, long_term=40, episodic=30, semantic=30
    budget = ContextBudgetManager(total_context_tokens=1000)

    assert budget.layer_limit("short_term") == 100
    assert budget.layer_limit("long_term") == 40
    assert budget.layer_limit("episodic") == 30
    assert budget.layer_limit("semantic") == 30

    # Huge raw text exceeding limits
    long_raw_text = "Nội dung chính sách đổi trả hàng hóa rất dài. " * 50  # ~500 chars = ~125 tokens

    layers = {
        "short_term": "User: Cần mua laptop",
        "long_term": "Sở thích: Thích máy mỏng nhẹ",
        "semantic": long_raw_text,
    }

    assembled, breakdown = budget.assemble(layers)

    # Verify XML tags present
    assert "<SHORT_TERM>" in assembled
    assert "<LONG_TERM>" in assembled
    assert "<SEMANTIC>" in assembled
    assert "<EPISODIC>" not in assembled  # Was empty

    # Verify semantic layer was trimmed under budget
    assert "[...trimmed by context budget...]" in assembled
    assert breakdown["semantic"]["used_tokens"] <= budget.layer_limit("semantic") + 15


def test_memory_intent_router():
    """Verifies that queries are routed to minimal relevant layers."""
    # 1. Short-term recall
    r1 = route_memory_query("Vừa nãy tôi vừa nhắc đến chiếc laptop nào vậy?")
    assert "short_term" in r1

    # 2. Long-term customer profile
    r2 = route_memory_query("Gợi ý cho tôi sản phẩm hợp với sở thích và ngân sách của tôi.")
    assert "long_term" in r2

    # 3. Episodic past experience
    r3 = route_memory_query("Lần trước gặp sự cố sọc màn hình thì kỹ thuật viên đã xử lý thế nào?")
    assert "episodic" in r3

    # 4. Semantic domain knowledge
    r4 = route_memory_query("Thời gian và chính sách đổi trả hàng lỗi quy định như thế nào?")
    assert "semantic" in r4


def test_declarative_facts_recency_wins():
    """Verifies that updated facts supersede older facts (Recency Wins)."""
    mem = EnterpriseMemoryManager()
    user_id = "cust_minh_01"

    # 1. Day 1: Customer likes Samsung
    mem.set_user_fact(user_id, "brand_preference", "Samsung", source="chat_day1")
    facts1 = mem.get_user_facts(user_id)
    assert facts1["brand_preference"] == "Samsung"

    # 2. Day 2: Customer changes mind to Apple -> Recency Wins
    mem.set_user_fact(user_id, "brand_preference", "Apple", source="chat_day2")
    facts2 = mem.get_user_facts(user_id)
    assert facts2["brand_preference"] == "Apple"

    # 3. Check provenance history preserved old fact as SUPERSEDED
    history = mem._fact_history[user_id]
    assert len(history) == 1
    assert history[0].value == "Samsung"
    assert history[0].validity == FactValidity.SUPERSEDED

    # 4. Bulk consolidation from reflection worker
    mem.consolidate_facts(user_id, {"budget_max_vnd": "25000000", "preferred_color": "Titanium"})
    facts3 = mem.get_user_facts(user_id)
    assert facts3["budget_max_vnd"] == "25000000"
    assert facts3["preferred_color"] == "Titanium"
    assert facts3["brand_preference"] == "Apple"


def test_decree_13_privacy_and_right_to_be_forgotten():
    """Verifies Decree 13/2023/ND-CP compliance: PII masking, consent opt-in, and tombstoning."""
    mem = EnterpriseMemoryManager()
    user_id = "cust_lan_02"

    # 1. PII Masking during fact recording
    mem.set_user_fact(
        user_id,
        "contact_info",
        "Số điện thoại của tôi là 0912345678 và CCCD 001095012345 gửi về email lan@gmail.com",
    )
    facts = mem.get_user_facts(user_id)
    stored_text = facts["contact_info"]
    assert "0912345678" not in stored_text
    assert "[REDACTED_PHONE]" in stored_text
    assert "001095012345" not in stored_text
    assert "[REDACTED_CCCD]" in stored_text
    assert "lan@gmail.com" not in stored_text
    assert "[REDACTED_EMAIL]" in stored_text

    # 2. Customer revokes consent -> New facts rejected
    mem.privacy_guard.set_consent(user_id, opt_in=False)
    mem.set_user_fact(user_id, "new_preference", "Giao hàng sau 18h")
    assert "new_preference" not in mem.get_user_facts(user_id)

    # 3. Exercise Right-to-be-Forgotten (Tombstoning)
    assert mem.exercise_right_to_be_forgotten(user_id, "contact_info") is True
    assert "contact_info" not in mem.get_user_facts(user_id)
    assert mem.declarative_facts[user_id]["contact_info"].is_tombstoned is True


def test_episodic_memory_and_ebbinghaus_decay():
    """Verifies episodic trajectories, reusable strategies, and time decay scoring."""
    mem = EnterpriseMemoryManager(ebbinghaus_half_life_days=7.0)

    # 1. Record 2 episodes
    ep1 = EpisodicTrajectory(
        task_id="task_scr_01",
        goal="Tư vấn xử lý sự cố màn hình chớp nháy sau cập nhật",
        steps_taken=["check_model", "query_warranty", "guide_store_visit"],
        outcome_success=True,
        reflection_critique="Cần kiểm tra firmware trước khi yêu cầu mang ra TTBH",
        reusable_strategy="Kiểm tra cập nhật firmware hoặc khởi động lại trước khi tạo ticket TTBH",
        importance=1.0,
        timestamp=time.time(),  # Recent
    )
    ep2 = EpisodicTrajectory(
        task_id="task_old_02",
        goal="Tư vấn mua phụ kiện chuột không dây",
        steps_taken=["recommend_mouse"],
        outcome_success=True,
        reflection_critique="",
        importance=0.8,
        timestamp=time.time() - (14 * 86400),  # 14 days ago (2 half-lives)
    )

    mem.record_episode(ep1)
    mem.record_episode(ep2)

    # 2. Retrieve for screen issue query
    retrieved = mem.retrieve_similar_episodes("sự cố màn hình chớp nháy", top_k=1)
    assert len(retrieved) == 1
    assert retrieved[0].task_id == "task_scr_01"

    # 3. Verify Ebbinghaus decay math
    decay_old = mem.compute_ebbinghaus_retention(1.0, 14 * 86400)
    assert decay_old == pytest.approx(0.25, abs=0.02)  # (1/2)^2 = 0.25


def test_end_to_end_merged_context_retrieval():
    """Verifies full end-to-end memory pipeline uniting router, short-term, declarative, episodic and semantic."""
    mem = EnterpriseMemoryManager(total_context_tokens=8000)
    user_id = "cust_viet_03"
    session_id = "thread_sess_viet"

    # Setup memory state
    mem.add_working_turn(session_id, "user", "Tôi đang tìm laptop dưới 20 triệu.")
    mem.add_working_turn(session_id, "assistant", "Dạ em có Asus Vivobook và Lenovo ThinkBook ạ.")
    mem.set_user_fact(user_id, "preferred_brand", "Asus")
    mem.set_user_fact(user_id, "work_domain", "Lập trình viên phần mềm")

    # Query asking for recommendation based on preferences
    query = "Gợi ý cho tôi mẫu phù hợp với sở thích của tôi và chính sách bảo hành."
    semantic_doc = "Chính sách bảo hành MWG: Bảo hành 2 năm chính hãng, lỗi 1 đổi 1 trong 30 ngày."

    context_xml, telemetry = mem.retrieve_merged_context(
        user_id=user_id,
        session_id=session_id,
        query=query,
        semantic_text=semantic_doc,
    )

    # Check assembled content
    assert "<LONG_TERM>" in context_xml
    assert "preferred_brand: Asus" in context_xml
    assert "Lập trình viên phần mềm" in context_xml
    assert "<SEMANTIC>" in context_xml
    assert "Bảo hành 2 năm chính hãng" in context_xml

    # Verify telemetry breakdown
    assert telemetry["long_term"]["used_tokens"] > 0
    assert telemetry["semantic"]["used_tokens"] > 0
