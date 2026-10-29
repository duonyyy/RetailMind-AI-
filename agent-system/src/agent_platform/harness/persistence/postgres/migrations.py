from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from agent_platform.harness.persistence.ports import (
    PersistenceError,
    sanitize_persistence_error,
)

logger = logging.getLogger(__name__)

_SAFE_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

REQUIRED_AGENT_TABLES: List[str] = [
    "checkpoint_migrations",
    "checkpoints",
    "checkpoint_blobs",
    "checkpoint_writes",
    "agent_kv_store",
    "thread_ownership",
    "hitl_approvals",
    "tool_idempotency",
    "audit_events",
]

REQUIRED_CHECKPOINT_MIGRATION_VERSION = 9


def validate_sql_identifier(ident: str, label: str = "identifier") -> str:
    """Validate a PostgreSQL schema or role identifier against injection."""
    if not ident or not _SAFE_IDENT_RE.match(ident):
        raise ValueError(f"Invalid PostgreSQL {label}: {ident!r}")
    return ident


def with_schema_search_path(dsn: str, schema: str = "agent") -> str:
    """Ensure a PostgreSQL connection string sets search_path to `schema`."""
    validate_sql_identifier(schema, "schema")
    if not dsn or not dsn.strip():
        raise PersistenceError("PostgreSQL DSN is empty or not configured.")

    if dsn.startswith(("postgres://", "postgresql://")):
        parsed = urlparse(dsn)
        query_items = dict(parse_qsl(parsed.query, keep_blank_values=True))
        existing_opts = query_items.get("options", "")
        search_opt = f"-csearch_path={schema}"
        if "search_path" not in existing_opts:
            query_items["options"] = (
                f"{existing_opts} {search_opt}".strip() if existing_opts else search_opt
            )
        new_query = urlencode(query_items)
        return urlunparse(
            (
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                new_query,
                parsed.fragment,
            )
        )
    if "search_path" not in dsn:
        return f"{dsn} options='-c search_path={schema}'"
    return dsn


def _extract_col(row: Any, key: str, idx: int = 0) -> Any:
    if isinstance(row, dict):
        return row.get(key)
    return row[idx]


def verify_runtime_schema_ready_sync(conn: Any, schema: str = "agent") -> None:
    """Verify required Agent tables and LangGraph checkpoint version without executing DDL."""
    validate_sql_identifier(schema, "schema")
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = %s
                """,
                (schema,),
            )
            present = {_extract_col(row, "table_name", 0) for row in cur.fetchall()}
            missing = [t for t in REQUIRED_AGENT_TABLES if t not in present]
            if missing:
                raise PersistenceError(
                    f"Agent persistence schema '{schema}' is missing required tables: {missing}. "
                    "Run the migration script before starting the runtime."
                )

            cur.execute(
                f"SELECT MAX(v) AS max_v FROM {schema}.checkpoint_migrations"
            )
            row = cur.fetchone()
            val = _extract_col(row, "max_v", 0) if row is not None else None
            max_v = val if val is not None else -1
            if int(max_v) < REQUIRED_CHECKPOINT_MIGRATION_VERSION:
                raise PersistenceError(
                    f"LangGraph checkpoint_migrations version in schema '{schema}' is {max_v}, "
                    f"expected >= {REQUIRED_CHECKPOINT_MIGRATION_VERSION}."
                )
    except PersistenceError:
        raise
    except Exception as exc:
        raise PersistenceError(
            f"Failed to verify PostgreSQL schema '{schema}': {sanitize_persistence_error(exc)}"
        ) from exc


async def verify_runtime_schema_ready_async(conn: Any, schema: str = "agent") -> None:
    """Async verification of required Agent tables and checkpoint version without DDL."""
    validate_sql_identifier(schema, "schema")
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = %s
                """,
                (schema,),
            )
            rows = await cur.fetchall()
            present = {_extract_col(row, "table_name", 0) for row in rows}
            missing = [t for t in REQUIRED_AGENT_TABLES if t not in present]
            if missing:
                raise PersistenceError(
                    f"Agent persistence schema '{schema}' is missing required tables: {missing}. "
                    "Run the migration script before starting the runtime."
                )

            await cur.execute(
                f"SELECT MAX(v) AS max_v FROM {schema}.checkpoint_migrations"
            )
            row = await cur.fetchone()
            val = _extract_col(row, "max_v", 0) if row is not None else None
            max_v = val if val is not None else -1
            if int(max_v) < REQUIRED_CHECKPOINT_MIGRATION_VERSION:
                raise PersistenceError(
                    f"LangGraph checkpoint_migrations version in schema '{schema}' is {max_v}, "
                    f"expected >= {REQUIRED_CHECKPOINT_MIGRATION_VERSION}."
                )
    except PersistenceError:
        raise
    except Exception as exc:
        raise PersistenceError(
            f"Failed to verify PostgreSQL schema '{schema}': {sanitize_persistence_error(exc)}"
        ) from exc


def build_schema_ddl_statements(schema: str = "agent") -> List[str]:
    """Return idempotent DDL statements for creating an isolated Agent schema (or test schema)."""
    validate_sql_identifier(schema, "schema")
    return [
        f"CREATE SCHEMA IF NOT EXISTS {schema}",
        f"""
        CREATE TABLE IF NOT EXISTS {schema}.schema_migrations (
            version INTEGER PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {schema}.checkpoint_migrations (
            v INTEGER PRIMARY KEY
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {schema}.checkpoints (
            thread_id TEXT NOT NULL,
            checkpoint_ns TEXT NOT NULL DEFAULT '',
            checkpoint_id TEXT NOT NULL,
            parent_checkpoint_id TEXT,
            type TEXT,
            checkpoint JSONB NOT NULL,
            metadata JSONB NOT NULL DEFAULT '{{}}'::jsonb,
            PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {schema}.checkpoint_blobs (
            thread_id TEXT NOT NULL,
            checkpoint_ns TEXT NOT NULL DEFAULT '',
            channel TEXT NOT NULL,
            version TEXT NOT NULL,
            type TEXT NOT NULL,
            blob BYTEA,
            PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {schema}.checkpoint_writes (
            thread_id TEXT NOT NULL,
            checkpoint_ns TEXT NOT NULL DEFAULT '',
            checkpoint_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            idx INTEGER NOT NULL,
            channel TEXT NOT NULL,
            type TEXT,
            blob BYTEA NOT NULL,
            task_path TEXT NOT NULL DEFAULT '',
            PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
        )
        """,
        f"CREATE INDEX IF NOT EXISTS checkpoints_thread_id_idx ON {schema}.checkpoints(thread_id)",
        f"CREATE INDEX IF NOT EXISTS checkpoint_blobs_thread_id_idx ON {schema}.checkpoint_blobs(thread_id)",
        f"CREATE INDEX IF NOT EXISTS checkpoint_writes_thread_id_idx ON {schema}.checkpoint_writes(thread_id)",
        f"""
        INSERT INTO {schema}.checkpoint_migrations (v)
        SELECT generate_series(0, 9)
        ON CONFLICT (v) DO NOTHING
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {schema}.agent_kv_store (
            key VARCHAR(255) PRIMARY KEY,
            value JSONB NOT NULL,
            expires_at DOUBLE PRECISION,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {schema}.thread_ownership (
            thread_id VARCHAR(128) PRIMARY KEY,
            user_id VARCHAR(128) NOT NULL,
            tenant_id VARCHAR(128) NOT NULL DEFAULT 'default',
            role VARCHAR(64) NOT NULL DEFAULT 'user',
            created_at DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
            updated_at DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {schema}.hitl_approvals (
            approval_id VARCHAR(128) PRIMARY KEY,
            thread_id VARCHAR(128) NOT NULL,
            run_id VARCHAR(128) NOT NULL,
            requester_user_id VARCHAR(128),
            requester_tenant_id VARCHAR(128),
            tool_name VARCHAR(128) NOT NULL,
            arguments JSONB NOT NULL DEFAULT '{{}}'::jsonb,
            approver_role VARCHAR(64) NOT NULL DEFAULT 'admin',
            status VARCHAR(32) NOT NULL DEFAULT 'pending'
                CONSTRAINT chk_{schema}_hitl_status CHECK (status IN ('pending', 'approved', 'rejected')),
            decision_by VARCHAR(128),
            note TEXT,
            created_at DOUBLE PRECISION NOT NULL,
            resolved_at DOUBLE PRECISION
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {schema}.tool_idempotency (
            idempotency_key VARCHAR(128) PRIMARY KEY,
            tenant_id VARCHAR(128) NOT NULL DEFAULT 'default',
            user_id VARCHAR(128) NOT NULL DEFAULT '',
            thread_id VARCHAR(128) NOT NULL,
            tool_name VARCHAR(128) NOT NULL,
            call_id VARCHAR(128) NOT NULL,
            payload_hash CHAR(64) NOT NULL,
            backend_idempotency_key VARCHAR(128),
            status VARCHAR(32) NOT NULL
                CONSTRAINT chk_{schema}_tool_idemp_status CHECK (status IN ('in_progress', 'completed', 'unknown_outcome')),
            response_output TEXT,
            is_error BOOLEAN NOT NULL DEFAULT FALSE,
            error_code VARCHAR(64),
            created_at DOUBLE PRECISION NOT NULL,
            updated_at DOUBLE PRECISION NOT NULL,
            expires_at DOUBLE PRECISION
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {schema}.audit_events (
            seq BIGSERIAL PRIMARY KEY,
            event_id VARCHAR(128) NOT NULL UNIQUE,
            timestamp DOUBLE PRECISION NOT NULL,
            thread_id VARCHAR(128) NOT NULL,
            user_id VARCHAR(128) NOT NULL,
            role VARCHAR(64) NOT NULL,
            tenant_id VARCHAR(128) NOT NULL,
            tool_name VARCHAR(128) NOT NULL,
            input_masked JSONB NOT NULL DEFAULT '{{}}'::jsonb,
            decision VARCHAR(64) NOT NULL,
            approver VARCHAR(128),
            prev_hash CHAR(64) NOT NULL,
            current_hash CHAR(64) NOT NULL
        )
        """,
        f"""
        INSERT INTO {schema}.schema_migrations (version, name)
        VALUES (1, '001_agent_durable_persistence_schema')
        ON CONFLICT (version) DO NOTHING
        """,
    ]


def apply_agent_migrations(
    admin_dsn: str,
    schema: str = "agent",
    runtime_user: Optional[str] = None,
    runtime_password: Optional[str] = None,
) -> Dict[str, Any]:
    """Run Agent schema migrations and optional least-privilege role grants using admin DSN."""
    import psycopg
    from psycopg import sql

    validate_sql_identifier(schema, "schema")
    if runtime_user:
        validate_sql_identifier(runtime_user, "runtime_user")

    try:
        with psycopg.connect(admin_dsn, autocommit=False) as conn:
            with conn.cursor() as cur:
                for stmt in build_schema_ddl_statements(schema=schema):
                    cur.execute(stmt)

                if runtime_user:
                    cur.execute(
                        "SELECT 1 FROM pg_roles WHERE rolname = %s",
                        (runtime_user,),
                    )
                    exists = cur.fetchone() is not None
                    if not exists:
                        cur.execute(
                            sql.SQL(
                                "CREATE ROLE {} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION"
                            ).format(sql.Identifier(runtime_user))
                        )
                    else:
                        cur.execute(
                            sql.SQL(
                                "ALTER ROLE {} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION"
                            ).format(sql.Identifier(runtime_user))
                        )
                    if runtime_password:
                        cur.execute(
                            sql.SQL("ALTER ROLE {} WITH PASSWORD {}").format(
                                sql.Identifier(runtime_user),
                                sql.Literal(runtime_password),
                            )
                        )
                    cur.execute(
                        sql.SQL("ALTER ROLE {} SET search_path TO {}").format(
                            sql.Identifier(runtime_user),
                            sql.Identifier(schema),
                        )
                    )
                    cur.execute(
                        sql.SQL("REVOKE ALL ON SCHEMA public FROM {}").format(
                            sql.Identifier(runtime_user)
                        )
                    )
                    cur.execute(
                        sql.SQL("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {}").format(
                            sql.Identifier(runtime_user)
                        )
                    )
                    cur.execute(
                        sql.SQL("REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM {}").format(
                            sql.Identifier(runtime_user)
                        )
                    )
                    cur.execute(
                        sql.SQL("GRANT USAGE ON SCHEMA {} TO {}").format(
                            sql.Identifier(schema),
                            sql.Identifier(runtime_user),
                        )
                    )
                    cur.execute(
                        sql.SQL("REVOKE CREATE ON SCHEMA {} FROM {}").format(
                            sql.Identifier(schema),
                            sql.Identifier(runtime_user),
                        )
                    )
                    cur.execute(
                        sql.SQL("REVOKE ALL ON ALL TABLES IN SCHEMA {} FROM {}").format(
                            sql.Identifier(schema),
                            sql.Identifier(runtime_user),
                        )
                    )
                    cur.execute(
                        sql.SQL(
                            "GRANT SELECT ON {}.schema_migrations, {}.checkpoint_migrations TO {}"
                        ).format(
                            sql.Identifier(schema),
                            sql.Identifier(schema),
                            sql.Identifier(runtime_user),
                        )
                    )
                    cur.execute(
                        sql.SQL(
                            "GRANT SELECT, INSERT, UPDATE, DELETE ON "
                            "{s}.checkpoints, {s}.checkpoint_blobs, {s}.checkpoint_writes, "
                            "{s}.agent_kv_store, {s}.thread_ownership, {s}.hitl_approvals, "
                            "{s}.tool_idempotency TO {u}"
                        ).format(
                            s=sql.Identifier(schema),
                            u=sql.Identifier(runtime_user),
                        )
                    )
                    cur.execute(
                        sql.SQL(
                            "GRANT SELECT, INSERT ON {s}.audit_events TO {u}"
                        ).format(
                            s=sql.Identifier(schema),
                            u=sql.Identifier(runtime_user),
                        )
                    )
                    cur.execute(
                        sql.SQL(
                            "GRANT USAGE, SELECT ON SEQUENCE {s}.audit_events_seq_seq TO {u}"
                        ).format(
                            s=sql.Identifier(schema),
                            u=sql.Identifier(runtime_user),
                        )
                    )
            conn.commit()
            verify_runtime_schema_ready_sync(conn, schema=schema)
        return {"schema": schema, "status": "applied", "runtime_user": runtime_user}
    except PersistenceError:
        raise
    except Exception as exc:
        raise PersistenceError(
            f"Agent migration failed for schema '{schema}': {sanitize_persistence_error(exc)}"
        ) from exc


if __name__ == "__main__":
    admin_url = os.getenv("POSTGRES_MIGRATION_URL") or os.getenv("POSTGRES_URL", "")
    target_schema = os.getenv("AGENT_POSTGRES_SCHEMA", "agent")
    rt_user = os.getenv("AGENT_DB_RUNTIME_USER", "retailmind_agent_runtime")
    rt_password = os.getenv("AGENT_DB_RUNTIME_PASSWORD")
    res = apply_agent_migrations(
        admin_dsn=admin_url,
        schema=target_schema,
        runtime_user=rt_user,
        runtime_password=rt_password,
    )
    logger.info("Agent persistence migration completed: %s", res)

