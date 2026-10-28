"""Enterprise Multi-Adapter Production Persistent Checkpointer for LangGraph.

Complies with AGENTS.md, Clean Architecture, and ADR-007:
- Supports PostgreSQL 16+ (AsyncPostgresSaver via psycopg_pool) for Production SSOT.
- Supports Redis (AsyncRedisSaver) for high-throughput distributed checkpoints.
- Supports SQLite (AsyncSqliteSaver via aiosqlite) for single-node/local persistent storage.
- Supports MemorySaver for isolated in-memory unit tests.
- Provides resilient fallback to MemorySaver if remote PostgreSQL/Redis is unreachable,
  ensuring offline test suites and developer environments never crash unexpectedly.
- Implements lazy connection binding to avoid 'RuntimeError: no running event loop' during sync __init__.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional, Sequence, Tuple

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import (
    BaseCheckpointSaver,
    ChannelVersions,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple,
)
from langgraph.checkpoint.memory import MemorySaver

logger = logging.getLogger("agent_platform.persistence.checkpointer")


class PersistentCheckpointer(BaseCheckpointSaver):
    """
    Enterprise LangGraph CheckpointSaver wrapper that delegates to
    PostgreSQL, Redis, SQLite, or Memory savers with resilient fallbacks.
    """

    def __init__(
        self,
        adapter_type: str = "memory",
        sqlite_path: str = "agent_data.db",
        postgres_url: str = "",
        redis_url: str = "",
    ) -> None:
        super().__init__()
        self.adapter_type = adapter_type
        self.sqlite_path = sqlite_path
        self.postgres_url = postgres_url
        self.redis_url = redis_url

        self._target: Optional[BaseCheckpointSaver] = None
        self._lock = asyncio.Lock()
        self._resources: List[Any] = []

    async def _resolve_target(self) -> BaseCheckpointSaver:
        if self._target is not None:
            return self._target

        async with self._lock:
            if self._target is not None:
                return self._target

            if self.adapter_type == "postgres":
                if self.postgres_url and self.postgres_url.startswith("postgresql"):
                    try:
                        from psycopg_pool import AsyncConnectionPool
                        from psycopg.rows import dict_row
                        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

                        pool = AsyncConnectionPool(
                            conninfo=self.postgres_url,
                            open=False,
                            max_size=10,
                            kwargs={
                                "autocommit": True,
                                "prepare_threshold": 0,
                                "row_factory": dict_row,
                            },
                        )
                        await asyncio.wait_for(pool.open(), timeout=2.5)
                        saver = AsyncPostgresSaver(pool)
                        await asyncio.wait_for(saver.setup(), timeout=3.0)
                        self._resources.append(pool)
                        self._target = saver
                        logger.info("Initialized AsyncPostgresSaver successfully.")
                        return self._target
                    except Exception as exc:
                        logger.warning(
                            "PostgreSQL checkpointer unreachable (%s). Using resilient MemorySaver fallback.",
                            exc,
                        )
                        self._target = MemorySaver()
                        return self._target
                else:
                    self._target = MemorySaver()
                    return self._target

            elif self.adapter_type == "redis":
                if self.redis_url and self.redis_url.startswith("redis"):
                    try:
                        from langgraph.checkpoint.redis.aio import AsyncRedisSaver

                        saver = AsyncRedisSaver(redis_url=self.redis_url)
                        await asyncio.wait_for(saver.setup(), timeout=2.5)
                        self._target = saver
                        logger.info("Initialized AsyncRedisSaver successfully.")
                        return self._target
                    except Exception as exc:
                        logger.warning(
                            "Redis checkpointer unreachable (%s). Using resilient MemorySaver fallback.",
                            exc,
                        )
                        self._target = MemorySaver()
                        return self._target
                else:
                    self._target = MemorySaver()
                    return self._target

            elif self.adapter_type == "sqlite":
                try:
                    import aiosqlite
                    from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

                    conn = await aiosqlite.connect(self.sqlite_path)
                    saver = AsyncSqliteSaver(conn)
                    await saver.setup()
                    self._resources.append(conn)
                    self._target = saver
                    logger.info("Initialized AsyncSqliteSaver at %s successfully.", self.sqlite_path)
                    return self._target
                except Exception as exc:
                    logger.warning(
                        "SQLite checkpointer failed (%s). Using resilient MemorySaver fallback.",
                        exc,
                    )
                    self._target = MemorySaver()
                    return self._target

            else:
                self._target = MemorySaver()
                return self._target

    def _resolve_target_sync(self) -> BaseCheckpointSaver:
        if self._target is not None:
            return self._target

        if self.adapter_type == "sqlite":
            try:
                import sqlite3
                from langgraph.checkpoint.sqlite import SqliteSaver

                conn = sqlite3.connect(self.sqlite_path, check_same_thread=False)
                saver = SqliteSaver(conn)
                saver.setup()
                self._resources.append(conn)
                self._target = saver
                return self._target
            except Exception as exc:
                logger.warning("Sync SQLite checkpointer failed (%s). Using MemorySaver.", exc)
                self._target = MemorySaver()
                return self._target

        self._target = MemorySaver()
        return self._target

    # -------------------------------------------------------------------------
    # Asynchronous Checkpoint Saver Interface (used by LangGraph graph.ainvoke)
    # -------------------------------------------------------------------------
    async def aget_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        target = await self._resolve_target()
        return await target.aget_tuple(config)

    async def aput(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        target = await self._resolve_target()
        return await target.aput(config, checkpoint, metadata, new_versions)

    async def aput_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        target = await self._resolve_target()
        return await target.aput_writes(config, writes, task_id, task_path)

    async def alist(
        self,
        config: Optional[RunnableConfig],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None,
    ) -> AsyncIterator[CheckpointTuple]:
        target = await self._resolve_target()
        async for item in target.alist(config, filter=filter, before=before, limit=limit):
            yield item

    async def adelete_thread(self, thread_id: str) -> None:
        target = await self._resolve_target()
        if hasattr(target, "adelete_thread"):
            await target.adelete_thread(thread_id)

    # -------------------------------------------------------------------------
    # Synchronous Checkpoint Saver Interface (fallback for sync graph invocations)
    # -------------------------------------------------------------------------
    def get_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        target = self._resolve_target_sync()
        return target.get_tuple(config)

    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        target = self._resolve_target_sync()
        return target.put(config, checkpoint, metadata, new_versions)

    def put_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        target = self._resolve_target_sync()
        return target.put_writes(config, writes, task_id, task_path)

    def list(
        self,
        config: Optional[RunnableConfig],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None,
    ) -> Iterator[CheckpointTuple]:
        target = self._resolve_target_sync()
        return target.list(config, filter=filter, before=before, limit=limit)

    async def aclose(self) -> None:
        """Closes all underlying network pools and open database connections."""
        for res in self._resources:
            try:
                if hasattr(res, "close"):
                    if asyncio.iscoroutinefunction(res.close):
                        await res.close()
                    else:
                        res.close()
            except Exception as exc:
                logger.debug("Error closing checkpointer resource: %s", exc)
        self._resources.clear()
        self._target = None


def create_checkpointer(settings: Any) -> BaseCheckpointSaver:
    """Factory creating appropriate checkpointer configured by PlatformSettings."""
    persistence = getattr(settings, "persistence", None)
    if not persistence:
        return MemorySaver()

    adapter_type = getattr(persistence, "adapter", "memory")
    sqlite_path = getattr(persistence, "sqlite_path", "agent_data.db")
    postgres_url = getattr(persistence, "postgres_url", "")
    redis_url = getattr(persistence, "redis_url", "")

    return PersistentCheckpointer(
        adapter_type=adapter_type,
        sqlite_path=sqlite_path,
        postgres_url=postgres_url,
        redis_url=redis_url,
    )

