-- Explicit privileges for the currently implemented backend operations.
-- No blanket schema CRUD, no grants on future tables, and no schema DDL rights.
BEGIN;
GRANT CONNECT ON DATABASE retailmind_db TO retailmind_app_runtime;
GRANT USAGE ON SCHEMA public TO retailmind_app_runtime;
GRANT SELECT ON public.roles, public.users, public.variants, public.stores,
  public.inventory, public.orders, public.support_tickets, public.favorites,
  public.policies, public.document_versions, public.ingestion_jobs,
  public.audit_events, public.auth_refresh_sessions TO retailmind_app_runtime;
GRANT INSERT ON public.users, public.orders, public.support_tickets, public.favorites,
  public.policies, public.document_versions, public.ingestion_jobs,
  public.audit_events, public.auth_refresh_sessions TO retailmind_app_runtime;
GRANT UPDATE ON public.inventory, public.auth_refresh_sessions TO retailmind_app_runtime;
GRANT DELETE ON public.favorites TO retailmind_app_runtime;
-- Checkout reads authoritative catalog data and persists its receipt atomically.
GRANT SELECT ON public.brands, public.categories, public.products, public.order_items, public.idempotency_keys TO retailmind_app_runtime;
GRANT INSERT ON public.order_items, public.idempotency_keys TO retailmind_app_runtime;
GRANT UPDATE (target_id, response_payload) ON public.idempotency_keys TO retailmind_app_runtime;
COMMIT;
