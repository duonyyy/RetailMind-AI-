"""Exponential Backoff with Full Jitter for Resilient Enterprise Retries.

Complies with Chapter 12 (Question 12) of Enterprise Data Infra & LLMOps Architecture:
Eliminates the Thundering Herd Problem when upstream services recover or rate-limit (HTTP 429).
Formula:
    T_sleep = random.uniform(0, min(T_max, T_base * 2^attempt))
"""

from __future__ import annotations

import time
import random
import asyncio
import functools
import logging
from typing import Callable, TypeVar, Any, Tuple, Type, Optional

logger = logging.getLogger("retailmind.reliability.retry")

T = TypeVar("T")


def calculate_full_jitter_delay(
    attempt: int,
    base_delay: float = 0.5,
    max_delay: float = 10.0
) -> float:
    """Calculate sleep duration using Exponential Backoff with Full Jitter.
    
    Args:
        attempt: Zero-indexed retry attempt number (0, 1, 2, ...)
        base_delay: Initial base backoff in seconds (T_base)
        max_delay: Upper bound cap on delay in seconds (T_max)
    """
    ceiling = min(max_delay, base_delay * (2 ** attempt))
    # Full jitter selects uniform random between 0 and ceiling
    return random.uniform(0.0, ceiling)


def execute_with_retry(
    func: Callable[..., T],
    *args: Any,
    max_retries: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 2.0,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[int, Exception, float], None]] = None,
    **kwargs: Any
) -> T:
    """Execute a synchronous callable with Exponential Backoff + Full Jitter retries."""
    last_exc: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            return func(*args, **kwargs)
        except retryable_exceptions as exc:
            last_exc = exc
            if attempt == max_retries:
                logger.error(f"Execution failed after {max_retries} retries: {exc}")
                raise exc

            sleep_duration = calculate_full_jitter_delay(attempt, base_delay, max_delay)
            logger.warning(
                f"[Attempt {attempt + 1}/{max_retries}] Transient failure: {exc}. "
                f"Backing off with full jitter for {sleep_duration:.3f}s"
            )
            if on_retry:
                on_retry(attempt, exc, sleep_duration)

            time.sleep(sleep_duration)

    if last_exc:
        raise last_exc
    raise RuntimeError("Unexpected retry termination without result or exception.")


async def execute_async_with_retry(
    coro_func: Callable[..., Any],
    *args: Any,
    max_retries: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 2.0,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[int, Exception, float], None]] = None,
    **kwargs: Any
) -> Any:
    """Execute an asynchronous coroutine with Exponential Backoff + Full Jitter retries."""
    last_exc: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            return await coro_func(*args, **kwargs)
        except retryable_exceptions as exc:
            last_exc = exc
            if attempt == max_retries:
                logger.error(f"Async execution failed after {max_retries} retries: {exc}")
                raise exc

            sleep_duration = calculate_full_jitter_delay(attempt, base_delay, max_delay)
            logger.warning(
                f"[Async Attempt {attempt + 1}/{max_retries}] Transient failure: {exc}. "
                f"Backing off with full jitter for {sleep_duration:.3f}s"
            )
            if on_retry:
                on_retry(attempt, exc, sleep_duration)

            await asyncio.sleep(sleep_duration)

    if last_exc:
        raise last_exc
    raise RuntimeError("Unexpected async retry termination without result or exception.")


def with_retry(
    max_retries: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 2.0,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,)
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator applying exponential backoff with full jitter to any synchronous function."""
    def decorator(fn: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            return execute_with_retry(
                fn,
                *args,
                max_retries=max_retries,
                base_delay=base_delay,
                max_delay=max_delay,
                retryable_exceptions=retryable_exceptions,
                **kwargs
            )
        return wrapper
    return decorator
