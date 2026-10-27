"""Sliding Window Rate Limiter .

Bảo vệ hệ thống khỏi tấn công brute-force, DoS và vét cạn token budget ($$$).
Áp dụng thuật toán Cửa sổ trượt (Sliding Window) với cấu trúc hàng đợi deque theo từng client / IP.
"""

from __future__ import annotations
import time
from collections import defaultdict, deque
from typing import Dict, Tuple, Optional


class SlidingWindowRateLimiter:
    """Sliding Window Token Bucket / Rate Limiter with per-client tracking."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.user_windows: Dict[str, deque] = defaultdict(deque)
        self.total_requests = 0
        self.blocked_requests = 0

    def check_rate_limit(self, client_id: str) -> Tuple[bool, float]:
        """
        Kiểm tra xem request từ client_id có vượt quá quota cho phép không.
        
        Returns:
            (allowed: bool, wait_seconds: float)
            - allowed: True nếu được phép, False nếu bị chặn
            - wait_seconds: Thời gian cần chờ trước khi thử lại
        """
        self.total_requests += 1
        now = time.time()
        window = self.user_windows[client_id]

        # 1. Loại bỏ các mốc thời gian đã trôi qua ngoài cửa sổ trượt
        while window and window[0] < now - self.window_seconds:
            window.popleft()

        # 2. Nếu số lượng request trong cửa sổ vượt quá ngưỡng cho phép -> CHẶN
        if len(window) >= self.max_requests:
            wait_seconds = self.window_seconds - (now - window[0])
            self.blocked_requests += 1
            return False, max(0.1, round(wait_seconds, 1))

        # 3. Ghi nhận mốc thời gian mới và cho phép đi tiếp
        window.append(now)
        return True, 0.0

    def reset(self, client_id: Optional[str] = None) -> None:
        """Reset rate limiter state for a specific client or globally."""
        if client_id:
            self.user_windows.pop(client_id, None)
        else:
            self.user_windows.clear()
            self.total_requests = 0
            self.blocked_requests = 0

    def get_metrics(self) -> Dict[str, int]:
        return {
            "total_requests": self.total_requests,
            "blocked_requests": self.blocked_requests,
            "active_clients": len(self.user_windows)
        }
