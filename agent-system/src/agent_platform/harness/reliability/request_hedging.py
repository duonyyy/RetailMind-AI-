"""Speculative Request Hedging to Eliminate P99 Tail Latency."""

from __future__ import annotations
import asyncio
from typing import Callable, Coroutine, Any, Tuple


async def execute_with_hedging(
    primary_coro_fn: Callable[[], Coroutine[Any, Any, str]],
    secondary_coro_fn: Callable[[], Coroutine[Any, Any, str]],
    hedge_delay_seconds: float = 1.5
) -> Tuple[str, bool]:
    """Execute primary task; if it takes longer than hedge_delay_seconds, launch secondary in parallel."""
    primary_task = asyncio.create_task(primary_coro_fn())

    done, pending = await asyncio.wait([primary_task], timeout=hedge_delay_seconds)
    if primary_task in done:
        return primary_task.result(), False

    # Primary exceeded P99 threshold; hedge with secondary
    secondary_task = asyncio.create_task(secondary_coro_fn())
    done_hedged, _ = await asyncio.wait(
        [primary_task, secondary_task],
        return_when=asyncio.FIRST_COMPLETED
    )

    for task in [primary_task, secondary_task]:
        if not task.done():
            task.cancel()

    winner = done_hedged.pop()
    was_hedged = (winner == secondary_task)
    return winner.result(), was_hedged
