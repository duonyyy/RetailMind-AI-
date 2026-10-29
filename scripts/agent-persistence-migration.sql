-- =============================================================================
-- RetailMind AI — Agent Persistence Schema & Migration (Idempotent, Versioned)
-- =============================================================================
-- Creates the isolated `agent` schema and all durable persistence tables for:
--   1. LangGraph Checkpoints (checkpoint_migrations, checkpoints, checkpoint_blobs, checkpoint_writes)
--   2. Key-Value Store (agent_kv_store)
--   3. Session / Thread Ownership (thread_ownership)
--   4. HITL Approval Requests & Atomic Decisions (hitl_approvals)
--   5. Side-Effect Tool Idempotency (tool_idempotency)
--   6. Tamper-Evident Audit Event Ledger (audit_events)
--
-- Also migrates any existing Agent data from `public` into `agent` safely
-- using ON CONFLICT DO NOTHING (zero data loss, non-destructive).
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS agent;

-- 0. Version tracking for Agent schema migrations
CREATE TABLE IF NOT EXISTS agent.schema_migrations (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. LangGraph Checkpoint tables (compatible with langgraph-checkpoint-postgres v0..v9)
CREATE TABLE IF NOT EXISTS agent.checkpoint_migrations (
    v INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS agent.checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS agent.checkpoint_blobs (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL,
    version TEXT NOT NULL,
    type TEXT NOT NULL,
    blob BYTEA,
    PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);

CREATE TABLE IF NOT EXISTS agent.checkpoint_writes (
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
);

ALTER TABLE agent.checkpoint_blobs ALTER COLUMN blob DROP NOT NULL;
ALTER TABLE agent.checkpoint_writes ADD COLUMN IF NOT EXISTS task_path TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS checkpoints_thread_id_idx ON agent.checkpoints(thread_id);
CREATE INDEX IF NOT EXISTS checkpoint_blobs_thread_id_idx ON agent.checkpoint_blobs(thread_id);
CREATE INDEX IF NOT EXISTS checkpoint_writes_thread_id_idx ON agent.checkpoint_writes(thread_id);

INSERT INTO agent.checkpoint_migrations (v)
SELECT generate_series(0, 9)
ON CONFLICT (v) DO NOTHING;

-- 2. General Agent KV Store
CREATE TABLE IF NOT EXISTS agent.agent_kv_store (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at DOUBLE PRECISION,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_kv_store_expires_at
    ON agent.agent_kv_store (expires_at)
    WHERE expires_at IS NOT NULL;

-- 3. Durable Thread / Session Ownership
CREATE TABLE IF NOT EXISTS agent.thread_ownership (
    thread_id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    tenant_id VARCHAR(128) NOT NULL DEFAULT 'default',
    role VARCHAR(64) NOT NULL DEFAULT 'user',
    created_at DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()),
    updated_at DOUBLE PRECISION NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())
);

CREATE INDEX IF NOT EXISTS idx_agent_thread_ownership_principal
    ON agent.thread_ownership (user_id, tenant_id);

-- 4. Durable HITL Approvals (Atomic creation & single-winner resolution)
CREATE TABLE IF NOT EXISTS agent.hitl_approvals (
    approval_id VARCHAR(128) PRIMARY KEY,
    thread_id VARCHAR(128) NOT NULL,
    run_id VARCHAR(128) NOT NULL,
    requester_user_id VARCHAR(128),
    requester_tenant_id VARCHAR(128),
    tool_name VARCHAR(128) NOT NULL,
    arguments JSONB NOT NULL DEFAULT '{}'::jsonb,
    approver_role VARCHAR(64) NOT NULL DEFAULT 'admin',
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CONSTRAINT chk_agent_hitl_status CHECK (status IN ('pending', 'approved', 'rejected')),
    decision_by VARCHAR(128),
    note TEXT,
    created_at DOUBLE PRECISION NOT NULL,
    resolved_at DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_agent_hitl_approvals_status_created
    ON agent.hitl_approvals (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_hitl_approvals_thread_run
    ON agent.hitl_approvals (thread_id, run_id, tool_name);

-- 5. Durable Side-Effect Tool Idempotency Store
CREATE TABLE IF NOT EXISTS agent.tool_idempotency (
    idempotency_key VARCHAR(128) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL DEFAULT 'default',
    user_id VARCHAR(128) NOT NULL DEFAULT '',
    thread_id VARCHAR(128) NOT NULL,
    tool_name VARCHAR(128) NOT NULL,
    call_id VARCHAR(128) NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    backend_idempotency_key VARCHAR(128),
    status VARCHAR(32) NOT NULL
        CONSTRAINT chk_agent_tool_idempotency_status CHECK (status IN ('in_progress', 'completed', 'unknown_outcome')),
    response_output TEXT,
    is_error BOOLEAN NOT NULL DEFAULT FALSE,
    error_code VARCHAR(64),
    created_at DOUBLE PRECISION NOT NULL,
    updated_at DOUBLE PRECISION NOT NULL,
    expires_at DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_agent_tool_idempotency_thread_call
    ON agent.tool_idempotency (thread_id, call_id);

-- 6. Durable Tamper-Evident Audit Event Ledger
CREATE TABLE IF NOT EXISTS agent.audit_events (
    seq BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(128) NOT NULL UNIQUE,
    timestamp DOUBLE PRECISION NOT NULL,
    thread_id VARCHAR(128) NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    role VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(128) NOT NULL,
    tool_name VARCHAR(128) NOT NULL,
    input_masked JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision VARCHAR(64) NOT NULL,
    approver VARCHAR(128),
    prev_hash CHAR(64) NOT NULL,
    current_hash CHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_audit_events_thread_seq
    ON agent.audit_events (thread_id, seq ASC);

-- =============================================================================
-- Safe Non-Destructive Backfill from legacy `public` Agent tables (if present)
-- =============================================================================
DO $$
BEGIN
    IF to_regclass('public.checkpoints') IS NOT NULL THEN
        INSERT INTO agent.checkpoints (thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata)
        SELECT thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata
        FROM public.checkpoints
        ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id) DO NOTHING;
    END IF;

    IF to_regclass('public.checkpoint_blobs') IS NOT NULL THEN
        INSERT INTO agent.checkpoint_blobs (thread_id, checkpoint_ns, channel, version, type, blob)
        SELECT thread_id, checkpoint_ns, channel, version, type, blob
        FROM public.checkpoint_blobs
        ON CONFLICT (thread_id, checkpoint_ns, channel, version) DO NOTHING;
    END IF;

    IF to_regclass('public.checkpoint_writes') IS NOT NULL THEN
        INSERT INTO agent.checkpoint_writes (thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, type, blob, task_path)
        SELECT thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, type, blob, COALESCE(task_path, '')
        FROM public.checkpoint_writes
        ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id, task_id, idx) DO NOTHING;
    END IF;

    IF to_regclass('public.agent_kv_store') IS NOT NULL THEN
        INSERT INTO agent.agent_kv_store (key, value, expires_at)
        SELECT key, value, expires_at
        FROM public.agent_kv_store
        ON CONFLICT (key) DO NOTHING;

        -- Backfill structured thread_ownership from chat_owner:* KV records
        INSERT INTO agent.thread_ownership (thread_id, user_id, tenant_id, role, created_at, updated_at)
        SELECT
            SUBSTRING(key FROM 12),
            COALESCE(value->>'user_id', ''),
            COALESCE(value->>'tenant_id', 'default'),
            COALESCE(value->>'role', 'user'),
            EXTRACT(EPOCH FROM NOW()),
            EXTRACT(EPOCH FROM NOW())
        FROM public.agent_kv_store
        WHERE key LIKE 'chat_owner:%'
          AND jsonb_typeof(value) = 'object'
          AND COALESCE(value->>'user_id', '') <> ''
        ON CONFLICT (thread_id) DO NOTHING;

        -- Backfill structured hitl_approvals from approval:* KV records
        INSERT INTO agent.hitl_approvals (
            approval_id, thread_id, run_id, requester_user_id, requester_tenant_id,
            tool_name, arguments, approver_role, status, decision_by, note,
            created_at, resolved_at
        )
        SELECT
            COALESCE(value->>'approval_id', SUBSTRING(key FROM 10)),
            COALESCE(value->>'thread_id', ''),
            COALESCE(value->>'run_id', ''),
            value->>'requester_user_id',
            value->>'requester_tenant_id',
            COALESCE(value->>'tool_name', ''),
            COALESCE(value->'arguments', '{}'::jsonb),
            COALESCE(value->>'approver_role', 'admin'),
            CASE
                WHEN (value->>'status') IN ('pending', 'approved', 'rejected') THEN value->>'status'
                ELSE 'pending'
            END,
            value->>'decision_by',
            value->>'note',
            COALESCE((value->>'created_at')::double precision, EXTRACT(EPOCH FROM NOW())),
            (value->>'resolved_at')::double precision
        FROM public.agent_kv_store
        WHERE key LIKE 'approval:%'
          AND jsonb_typeof(value) = 'object'
        ON CONFLICT (approval_id) DO NOTHING;
    END IF;
END $$;

INSERT INTO agent.schema_migrations (version, name)
VALUES (1, '001_agent_durable_persistence_schema')
ON CONFLICT (version) DO NOTHING;

COMMIT;

