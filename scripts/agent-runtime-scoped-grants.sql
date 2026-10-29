-- =============================================================================
-- RetailMind AI — Agent Runtime Least-Privilege Grants
-- =============================================================================
-- Separation of duties:
--   * DDL / Migration role (`retailmind_user`): runs `agent-persistence-migration.sql`
--   * Runtime role (`retailmind_agent_runtime`):
--       - search_path locked to `agent`
--       - NO superuser, NO createdb, NO createrole, NO DDL (`CREATE` revoked)
--       - NO access to `public.*` commerce tables (orders, inventory, carts, users, etc.)
--       - Scoped DML only on `agent.*` persistence tables
-- =============================================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'retailmind_agent_runtime') THEN
        CREATE ROLE retailmind_agent_runtime WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOINHERIT
            NOREPLICATION;
    END IF;
END $$;

ALTER ROLE retailmind_agent_runtime WITH
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION;

ALTER ROLE retailmind_agent_runtime SET search_path TO agent;

GRANT CONNECT ON DATABASE retailmind_db TO retailmind_agent_runtime;

-- Explicitly block access to core business tables in `public`
REVOKE ALL ON SCHEMA public FROM retailmind_agent_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM retailmind_agent_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM retailmind_agent_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM retailmind_agent_runtime;

-- Grant USAGE only (NO CREATE / NO DDL) on schema `agent`
GRANT USAGE ON SCHEMA agent TO retailmind_agent_runtime;
REVOKE CREATE ON SCHEMA agent FROM retailmind_agent_runtime;

-- Read-only on migration metadata tables
REVOKE ALL ON ALL TABLES IN SCHEMA agent FROM retailmind_agent_runtime;
GRANT SELECT ON
    agent.schema_migrations,
    agent.checkpoint_migrations
TO retailmind_agent_runtime;

-- Scoped DML on operational Agent state tables
GRANT SELECT, INSERT, UPDATE, DELETE ON
    agent.checkpoints,
    agent.checkpoint_blobs,
    agent.checkpoint_writes,
    agent.agent_kv_store,
    agent.thread_ownership,
    agent.hitl_approvals,
    agent.tool_idempotency
TO retailmind_agent_runtime;

-- Append-only + read on audit ledger table (no UPDATE/DELETE for runtime role)
GRANT SELECT, INSERT ON
    agent.audit_events
TO retailmind_agent_runtime;

GRANT USAGE, SELECT ON SEQUENCE agent.audit_events_seq_seq TO retailmind_agent_runtime;

COMMIT;

