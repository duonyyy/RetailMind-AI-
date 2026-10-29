"""Enterprise Multi-Adapter Production Persistent Checkpointer for LangGraph.

Complies with AGENTS.md, Clean Architecture, and ADR-007:
- Supports PostgreSQL 16+ (AsyncPostgresSaver / PostgresSaver via psycopg_pool) for Production SSOT.
- Fail-closed for durable adapters (`postgres`, `sqlite`, `redis`): never silently falls back to `MemorySaver`.
- `MemorySaver` is used ONLY when `adapter_type == "memory"` is explicitly configured.
- Both async (`aget_tuple`, `aput`, `aput_writes`, `alist`, `adelete_thread`) and sync (`get_tuple`, `put`, `put_writes`, `list`)
  paths enforce the configured adapter without falling back to RAM.
- Scrubs DSNs, credentials, and PII from all logs and raised `PersistenceError` exceptions.
"""

from __future__ import annotations

import asyncio
import logging
import sys
import threading
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional, Sequence, Tuple

if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import (
    BaseCheckpointSaver,
    ChannelVersions,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple,
)
from langgraph.checkpoint.memory import MemorySaver

from agent_platform.harness.persistence.ports import (
    PersistenceError,
    sanitize_persistence_error,
)
from agent_platform.harness.persistence.postgres.migrations import (
    verify_runtime_schema_ready_async,
    verify_runtime_schema_ready_sync,
    with_schema_search_path,
)

logger = logging.getLogger("agent_platform.persistence.checkpointer")


class _SyncToAsyncPostgresAdapter(BaseCheckpointSaver):
    """Bridges synchronous PostgresSaver onto Windows ProactorEventLoop via asyncio.to_thread."""

    def __init__(self, sync_saver: BaseCheckpointSaver) -> None:
        super().__init__()
        self.sync_saver = sync_saver

    async def aget_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        return await asyncio.to_thread(self.sync_saver.get_tuple, config)

    async def aput(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        return await asyncio.to_thread(
            self.sync_saver.put, config, checkpoint, metadata, new_versions
        )

    async def aput_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        return await asyncio.to_thread(
            self.sync_saver.put_writes, config, writes, task_id, task_path
        )

    async def alist(
        self,
        config: Optional[RunnableConfig],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None,
    ) -> AsyncIterator[CheckpointTuple]:
        items = await asyncio.to_thread(
            lambda: list(
                self.sync_saver.list(
                    config, filter=filter, before=before, limit=limit
                )
            )
        )
        for item in items:
            yield item

    async def adelete_thread(self, thread_id: str) -> None:
        if hasattr(self.sync_saver, "delete_thread"):
            await asyncio.to_thread(self.sync_saver.delete_thread, thread_id)


class PersistentCheckpointer(BaseCheckpointSaver):
    """
    Enterprise LangGraph CheckpointSaver wrapper that delegates to
    PostgreSQL, Redis, SQLite, or Memory savers.

    Fail-closed guarantee:
    - When `adapter_type` is `postgres`, `sqlite`, or `redis`, any connection,
      schema verification, or read/write failure raises `PersistenceError`.
    - `MemorySaver` is ONLY instantiated when `adapter_type == "memory"`.
    """

    def __init__(
        self,
        adapter_type: str = "memory",
        sqlite_path: str = "agent_data.db",
        postgres_url: str = "",
        redis_url: str = "",
        postgres_schema: str = "agent",
        auto_setup: bool = False,
    ) -> None:
        super().__init__()
        self.adapter_type = (adapter_type or "memory").strip().lower()
        self.sqlite_path = sqlite_path
        self.postgres_url = postgres_url
        self.redis_url = redis_url
        self.postgres_schema = postgres_schema or "agent"
        self.auto_setup = auto_setup

        self._async_target: Optional[BaseCheckpointSaver] = None
        self._sync_target: Optional[BaseCheckpointSaver] = None
        self._async_lock = asyncio.Lock()
        self._sync_lock = threading.Lock()
        self._resources: List[Any] = []

    @property
    def _target(self) -> Optional[BaseCheckpointSaver]:
        """Backward-compatible property exposing the resolved saver instance."""
        return self._async_target or self._sync_target

    async def _resolve_target(self) -> BaseCheckpointSaver:
        if self._async_target is not None:
            return self._async_target

        async with self._async_lock:
            if self._async_target is not None:
                return self._async_target

            if self.adapter_type == "postgres":
                if not self.postgres_url or not self.postgres_url.startswith(
                    ("postgres://", "postgresql://")
                ):
                    raise PersistenceError(
                        "PostgreSQL checkpointer requires a valid postgres_url; "
                        "refusing to fall back to MemorySaver."
                    )
                loop_name = type(asyncio.get_running_loop()).__name__
                if sys.platform == "win32" and "Proactor" in loop_name:
                    sync_saver = await asyncio.to_thread(self._resolve_target_sync)
                    self._async_target = _SyncToAsyncPostgresAdapter(sync_saver)
                    return self._async_target

                pool = None
                try:
                    from psycopg_pool import AsyncConnectionPool
                    from psycopg.rows import dict_row
                    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

                    conninfo = with_schema_search_path(
                        self.postgres_url, self.postgres_schema
                    )
                    pool = AsyncConnectionPool(
                        conninfo=conninfo,
                        open=False,
                        min_size=1,
                        max_size=10,
                        timeout=3.0,
                        kwargs={
                            "autocommit": True,
                            "prepare_threshold": 0,
                            "row_factory": dict_row,
                        },
                    )
                    await asyncio.wait_for(pool.open(wait=True, timeout=3.0), timeout=3.5)
                    saver = AsyncPostgresSaver(pool)
                    if self.auto_setup:
                        await asyncio.wait_for(saver.setup(), timeout=5.0)
                    else:
                        async with pool.connection() as conn:
                            await verify_runtime_schema_ready_async(
                                conn, schema=self.postgres_schema
                            )
                    self._resources.append(pool)
                    self._async_target = saver
                    logger.info(
                        "Initialized AsyncPostgresSaver (schema=%s).",
                        self.postgres_schema,
                    )
                    return self._async_target
                except Exception as exc:
                    if pool is not None:
                        try:
                            await pool.close()
                        except Exception:
                            pass
                    safe_msg = sanitize_persistence_error(exc)
                    logger.error(
                        "PostgreSQL checkpointer initialization failed (schema=%s): %s",
                        self.postgres_schema,
                        safe_msg,
                    )
                    if isinstance(exc, PersistenceError):
                        raise
                    raise PersistenceError(
                        f"PostgreSQL checkpointer unavailable: {safe_msg}"
                    ) from exc

            elif self.adapter_type == "redis":
                if not self.redis_url or not self.redis_url.startswith(
                    ("redis://", "rediss://")
                ):
                    raise PersistenceError(
                        "Redis checkpointer requires a valid redis_url; "
                        "refusing to fall back to MemorySaver."
                    )
                try:
                    from langgraph.checkpoint.redis.aio import AsyncRedisSaver

                    saver = AsyncRedisSaver(redis_url=self.redis_url)
                    await asyncio.wait_for(saver.setup(), timeout=2.5)
                    self._resources.append(saver)
                    self._async_target = saver
                    logger.info("Initialized AsyncRedisSaver successfully.")
                    return self._async_target
                except Exception as exc:
                    safe_msg = sanitize_persistence_error(exc)
                    logger.error("Redis checkpointer initialization failed: %s", safe_msg)
                    raise PersistenceError(
                        f"Redis checkpointer unavailable: {safe_msg}"
                    ) from exc

            elif self.adapter_type == "sqlite":
                if not self.sqlite_path or self.sqlite_path.strip() == ":memory:":
                    raise PersistenceError(
                        "SQLite checkpointer cannot use ':memory:' when durable sqlite adapter is configured."
                    )
                conn = None
                try:
                    import aiosqlite
                    from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

                    conn = await aiosqlite.connect(self.sqlite_path)
                    saver = AsyncSqliteSaver(conn)
                    await saver.setup()
                    self._resources.append(conn)
                    self._async_target = saver
                    logger.info(
                        "Initialized AsyncSqliteSaver at %s successfully.",
                        self.sqlite_path,
                    )
                    return self._async_target
                except Exception as exc:
                    if conn is not None:
                        try:
                            await conn.close()
                        except Exception:
                            pass
                    safe_msg = sanitize_persistence_error(exc)
                    logger.error("SQLite checkpointer initialization failed: %s", safe_msg)
                    raise PersistenceError(
                        f"SQLite checkpointer unavailable: {safe_msg}"
                    ) from exc

            elif self.adapter_type == "memory":
                self._async_target = MemorySaver()
                return self._async_target

            else:
                raise PersistenceError(
                    f"Unsupported checkpointer adapter_type: {self.adapter_type!r}"
                )

    def _resolve_target_sync(self) -> BaseCheckpointSaver:
        if self._sync_target is not None:
            return self._sync_target

        with self._sync_lock:
            if self._sync_target is not None:
                return self._sync_target

            if self.adapter_type == "postgres":
                if not self.postgres_url or not self.postgres_url.startswith(
                    ("postgres://", "postgresql://")
                ):
                    raise PersistenceError(
                        "Sync PostgreSQL checkpointer requires a valid postgres_url; "
                        "refusing to fall back to MemorySaver."
                    )
                pool = None
                try:
                    from psycopg_pool import ConnectionPool
                    from psycopg.rows import dict_row
                    from langgraph.checkpoint.postgres import PostgresSaver

                    conninfo = with_schema_search_path(
                        self.postgres_url, self.postgres_schema
                    )
                    pool = ConnectionPool(
                        conninfo=conninfo,
                        open=False,
                        min_size=1,
                        max_size=5,
                        timeout=3.0,
                        kwargs={
                            "autocommit": True,
                            "prepare_threshold": 0,
                            "row_factory": dict_row,
                        },
                    )
                    pool.open(wait=True, timeout=3.0)
                    saver = PostgresSaver(pool)
                    if self.auto_setup:
                        saver.setup()
                    else:
                        with pool.connection() as conn:
                            verify_runtime_schema_ready_sync(
                                conn, schema=self.postgres_schema
                            )
                    self._resources.append(pool)
                    self._sync_target = saver
                    return self._sync_target
                except Exception as exc:
                    if pool is not None:
                        try:
                            pool.close()
                        except Exception:
                            pass
                    safe_msg = sanitize_persistence_error(exc)
                    logger.error(
                        "Sync PostgreSQL checkpointer initialization failed (schema=%s): %s",
                        self.postgres_schema,
                        safe_msg,
                    )
                    if isinstance(exc, PersistenceError):
                        raise
                    raise PersistenceError(
                        f"Sync PostgreSQL checkpointer unavailable: {safe_msg}"
                    ) from exc

            elif self.adapter_type == "sqlite":
                if not self.sqlite_path or self.sqlite_path.strip() == ":memory:":
                    raise PersistenceError(
                        "Sync SQLite checkpointer cannot use ':memory:' when durable sqlite adapter is configured."
                    )
                conn = None
                try:
                    import sqlite3
                    from langgraph.checkpoint.sqlite import SqliteSaver

                    conn = sqlite3.connect(self.sqlite_path, check_same_thread=False)
                    saver = SqliteSaver(conn)
                    saver.setup()
                    self._resources.append(conn)
                    self._sync_target = saver
                    return self._sync_target
                except Exception as exc:
                    if conn is not None:
                        try:
                            conn.close()
                        except Exception:
                            pass
                    safe_msg = sanitize_persistence_error(exc)
                    logger.error("Sync SQLite checkpointer failed: %s", safe_msg)
                    raise PersistenceError(
                        f"Sync SQLite checkpointer unavailable: {safe_msg}"
                    ) from exc

            elif self.adapter_type == "redis":
                if not self.redis_url or not self.redis_url.startswith(
                    ("redis://", "rediss://")
                ):
                    raise PersistenceError(
                        "Sync Redis checkpointer requires a valid redis_url; "
                        "refusing to fall back to MemorySaver."
                    )
                try:
                    from langgraph.checkpoint.redis import RedisSaver

                    saver = RedisSaver(redis_url=self.redis_url)
                    saver.setup()
                    self._resources.append(saver)
                    self._sync_target = saver
                    return self._sync_target
                except Exception as exc:
                    safe_msg = sanitize_persistence_error(exc)
                    logger.error("Sync Redis checkpointer failed: %s", safe_msg)
                    raise PersistenceError(
                        f"Sync Redis checkpointer unavailable: {safe_msg}"
                    ) from exc

            elif self.adapter_type == "memory":
                if self._async_target is not None and isinstance(
                    self._async_target, MemorySaver
                ):
                    self._sync_target = self._async_target
                else:
                    self._sync_target = MemorySaver()
                    self._async_target = self._sync_target
                return self._sync_target

            else:
                raise PersistenceError(
                    f"Unsupported checkpointer adapter_type: {self.adapter_type!r}"
                )

    # -------------------------------------------------------------------------
    # Asynchronous Checkpoint Saver Interface (used by LangGraph graph.ainvoke)
    # -------------------------------------------------------------------------
    async def aget_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        target = await self._resolve_target()
        try:
            return await target.aget_tuple(config)
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("Checkpoint aget_tuple failed: %s", safe_msg)
            raise PersistenceError(f"Checkpoint read failed: {safe_msg}") from exc

    async def aput(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        target = await self._resolve_target()
        try:
            return await target.aput(config, checkpoint, metadata, new_versions)
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("Checkpoint aput failed: %s", safe_msg)
            raise PersistenceError(f"Checkpoint write failed: {safe_msg}") from exc

    async def aput_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        target = await self._resolve_target()
        try:
            return await target.aput_writes(config, writes, task_id, task_path)
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("Checkpoint aput_writes failed: %s", safe_msg)
            raise PersistenceError(
                f"Checkpoint pending writes failed: {safe_msg}"
            ) from exc

    async def alist(
        self,
        config: Optional[RunnableConfig],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None,
    ) -> AsyncIterator[CheckpointTuple]:
        target = await self._resolve_target()
        try:
            async for item in target.alist(
                config, filter=filter, before=before, limit=limit
            ):
                yield item
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("Checkpoint alist failed: %s", safe_msg)
            raise PersistenceError(f"Checkpoint list failed: {safe_msg}") from exc

    async def adelete_thread(self, thread_id: str) -> None:
        target = await self._resolve_target()
        try:
            if hasattr(target, "adelete_thread"):
                await target.adelete_thread(thread_id)
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("Checkpoint adelete_thread failed: %s", safe_msg)
            raise PersistenceError(
                f"Checkpoint thread deletion failed: {safe_msg}"
            ) from exc

    # -------------------------------------------------------------------------
    # Synchronous Checkpoint Saver Interface (fail-closed parity with async)
    # -------------------------------------------------------------------------
    def get_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        target = self._resolve_target_sync()
        try:
            return target.get_tuple(config)
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("Sync checkpoint get_tuple failed: %s", safe_msg)
            raise PersistenceError(f"Sync checkpoint read failed: {safe_msg}") from exc

    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        target = self._resolve_target_sync()
        try:
            return target.put(config, checkpoint, metadata, new_versions)
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("Sync checkpoint put failed: %s", safe_msg)
            raise PersistenceError(f"Sync checkpoint write failed: {safe_msg}") from exc

    def put_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        target = self._resolve_target_sync()
        try:
            return target.put_writes(config, writes, task_id, task_path)
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("Sync checkpoint put_writes failed: %s", safe_msg)
            raise PersistenceError(
                f"Sync checkpoint pending writes failed: {safe_msg}"
            ) from exc

    def list(
        self,
        config: Optional[RunnableConfig],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[RunnableConfig] = None,
        limit: Optional[int] = None,
    ) -> Iterator[CheckpointTuple]:
        target = self._resolve_target_sync()
        try:
            yield from target.list(config, filter=filter, before=before, limit=limit)
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("Sync checkpoint list failed: %s", safe_msg)
            raise PersistenceError(f"Sync checkpoint list failed: {safe_msg}") from exc

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
                logger.debug(
                    "Error closing checkpointer resource: %s",
                    sanitize_persistence_error(exc),
                )
        self._resources.clear()
        self._async_target = None
        self._sync_target = None


def create_checkpointer(settings: Any) -> BaseCheckpointSaver:
    """Factory creating appropriate checkpointer configured by PlatformSettings."""
    persistence = getattr(settings, "persistence", None)
    if not persistence:
        return PersistentCheckpointer(adapter_type="memory")

    adapter_type = getattr(persistence, "adapter", "memory")
    sqlite_path = getattr(persistence, "sqlite_path", "agent_data.db")
    postgres_url = getattr(persistence, "postgres_url", "")
    postgres_schema = getattr(persistence, "postgres_schema", "agent")
    redis_url = getattr(persistence, "redis_url", "")

    return PersistentCheckpointer(
        adapter_type=adapter_type,
        sqlite_path=sqlite_path,
        postgres_url=postgres_url,
        redis_url=redis_url,
        postgres_schema=postgres_schema,
    )
