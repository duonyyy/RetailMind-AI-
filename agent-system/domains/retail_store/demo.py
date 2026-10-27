"""RetailMind AI — Interactive Demo Helper for retail_store domain.

Enables scripted LLM interactive simulation for Next.js frontend demonstration.
Zero Domain in Core: Business strings belong strictly inside domains/retail_store/.
"""

import uuid
from typing import Any
from agent_platform.llm.providers.scripted import ScriptedLLM


def dispatch_demo(llm: Any, query: str) -> None:
    """Dispatches realistic retail domain tool calls and answers for ScriptedLLM."""
    if not isinstance(llm, ScriptedLLM):
        return

    has_explicit_script = (
        len(llm.script) > 1
        or (
            len(llm.script) == 1
            and llm.script[0].content != "Dạ hệ thống đã nhận được câu hỏi và sẵn sàng hỗ trợ."
        )
    )

    if not has_explicit_script or llm.current_index >= len(llm.script):
        llm.script.clear()
        llm.current_index = 0
        q_lower = query.lower()

        if any(k in q_lower for k in ["bồi hoàn", "hoàn tiền", "500000", "500.000"]):
            llm.queue_tool_call(
                "request_return_or_refund",
                {
                    "order_id": "ORD-100201",
                    "amount": "500000",
                    "reason": "Khách yêu cầu bồi hoàn do giao hàng trễ",
                    "customer_name": "Nguyễn Văn An",
                },
                call_id=f"call_{uuid.uuid4().hex[:6]}",
            )
        elif any(k in q_lower for k in ["laptop", "dưới 20 triệu", "ram 16"]):
            llm.queue_tool_call(
                "lookup_laptop_catalog",
                {"max_price": "20000000", "min_ram_gb": 16},
                call_id=f"call_{uuid.uuid4().hex[:6]}",
            )
            llm.queue_answer(
                "Theo danh mục sản phẩm MWG 2026, các dòng laptop học tập - văn phòng dưới 20 triệu VNĐ "
                "trang bị RAM 16GB tối ưu bao gồm:\n\n"
                "1. Asus Vivobook 15 OLED A1505VA (Core i5-13500H, RAM 16GB, SSD 512GB) — Giá: 17.990.000 ₫\n"
                "2. Dell Inspiron 14 5430 (Core i5-1335U, RAM 16GB, SSD 512GB) — Giá: 18.490.000 ₫\n"
                "3. Lenovo ThinkBook 14 G6+ (Core Ultra 5 125H, RAM 16GB, SSD 512GB) — Giá: 19.990.000 ₫"
            )
        elif any(k in q_lower for k in ["đổi trả", "bảo hành", "30 ngày"]):
            llm.queue_tool_call(
                "search_knowledge",
                {"query": "chính sách đổi trả 30 ngày bảo hành"},
                call_id=f"call_{uuid.uuid4().hex[:6]}",
            )
            llm.queue_answer(
                "Theo Chính Sách Đổi Trả & Bảo Hành RetailMind AI 2026 (Điều 1), khách hàng có quyền "
                "đổi trả hàng trong vòng 30 ngày kể từ ngày nhận hàng với điều kiện sản phẩm còn nguyên tem mác, "
                "nguyên hộp và hóa đơn mua hàng. Toàn bộ máy tính xách tay đều được bảo hành chính hãng 24 tháng."
            )
        else:
            llm.queue_answer("Dạ hệ thống RetailMind AI đã tiếp nhận câu hỏi của bạn và sẵn sàng hỗ trợ.")
