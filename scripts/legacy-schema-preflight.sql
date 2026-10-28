-- Read-only check for the known differences between the running legacy schema
-- and the currently checked-in initial TypeORM schema. No data is displayed.
WITH required(table_name, column_name) AS (VALUES
 ('roles','permissions'), ('users','phone_number'),
 ('brands','code'), ('brands','logo_url'), ('categories','code'), ('categories','level'),
 ('stores','address'), ('stores','phone_number'),
 ('carts','customer_id'), ('carts','status'),
 ('orders','order_no'), ('orders','customer_id'), ('orders','total_vnd'),
 ('orders','idempotency_key_id'), ('orders','confirmed_at'), ('orders','cancelled_at'),
 ('order_items','sku_snapshot'), ('order_items','title_snapshot'), ('order_items','line_total_vnd'),
 ('idempotency_keys','id'), ('idempotency_keys','target_id'), ('idempotency_keys','status'), ('idempotency_keys','response_payload'),
 ('support_tickets','ticket_code'), ('support_tickets','customer_id'), ('support_tickets','priority'),
 ('auth_refresh_sessions','token_hash'), ('auth_refresh_sessions','user_id'),
 ('favorites','customer_id'), ('product_specs','variant_id'),
 ('conversations','customer_id'), ('messages','conversation_id'),
 ('policies','id'), ('document_versions','id'), ('ingestion_jobs','id'), ('audit_events','id'),
 ('migrations','name')
)
SELECT required.table_name || '.' || required.column_name AS missing_required_column
FROM required
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = required.table_name AND c.column_name = required.column_name
)
ORDER BY 1;

-- Same-named columns can still be incompatible, even where no column is missing.
SELECT 'support_tickets.order_id' AS field, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'order_id';
