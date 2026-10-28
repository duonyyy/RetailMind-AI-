-- One-time offline preparation for the observed legacy schema. This script is
-- intentionally restrictive: commerce tables must be empty, and a schema that
-- differs from the inspected legacy version must be reviewed manually.
-- Run only after a verified backup and stopping all application writers.
BEGIN;
SELECT pg_advisory_xact_lock(782021029);
LOCK TABLE public.users, public.roles, public.brands, public.categories, public.stores,
  public.carts, public.cart_items, public.orders, public.order_items,
  public.support_tickets, public.idempotency_keys IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE target_table text; row_count bigint;
BEGIN
  IF to_regclass('public.migrations') IS NOT NULL OR to_regclass('public.auth_refresh_sessions') IS NOT NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='phone')
     OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='phone_number')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='user_id')
     OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='customer_id') THEN
    RAISE EXCEPTION 'Not the expected legacy schema; stop and review';
  END IF;
  FOREACH target_table IN ARRAY ARRAY['carts','cart_items','orders','order_items','support_tickets','idempotency_keys'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', target_table) INTO row_count;
    IF row_count <> 0 THEN
      RAISE EXCEPTION 'Table % contains % rows; no implicit commerce-data conversion is permitted', target_table, row_count;
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.users RENAME COLUMN phone TO phone_number;
ALTER TABLE public.roles ADD COLUMN permissions text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.brands ADD COLUMN code varchar(64), ADD COLUMN logo_url varchar(500);
ALTER TABLE public.categories ADD COLUMN code varchar(64), ADD COLUMN level integer NOT NULL DEFAULT 1;
ALTER TABLE public.stores ADD COLUMN address varchar(500), ADD COLUMN phone_number varchar(50);
ALTER TABLE public.carts RENAME COLUMN user_id TO customer_id;
ALTER TABLE public.carts ADD COLUMN status varchar(32) NOT NULL DEFAULT 'active';
ALTER TABLE public.carts DROP CONSTRAINT carts_user_id_fkey;
ALTER TABLE public.carts ADD CONSTRAINT carts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE public.idempotency_keys DROP CONSTRAINT idempotency_keys_pkey;
ALTER TABLE public.idempotency_keys ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.idempotency_keys ADD PRIMARY KEY (id), ADD UNIQUE (key);
ALTER TABLE public.idempotency_keys RENAME COLUMN resource_id TO target_id;
ALTER TABLE public.idempotency_keys RENAME COLUMN response_json TO response_payload;
ALTER TABLE public.idempotency_keys ADD COLUMN status varchar(32) NOT NULL DEFAULT 'processing';
ALTER TABLE public.idempotency_keys ALTER COLUMN expires_at DROP NOT NULL;

ALTER TABLE public.orders RENAME COLUMN user_id TO customer_id;
ALTER TABLE public.orders RENAME COLUMN total_amount_vnd TO total_vnd;
ALTER TABLE public.orders ADD COLUMN order_no varchar(64) NOT NULL UNIQUE,
  ADD COLUMN idempotency_key_id uuid REFERENCES public.idempotency_keys(id) ON DELETE RESTRICT,
  ADD COLUMN confirmed_at timestamptz DEFAULT now(), ADD COLUMN cancelled_at timestamptz;
ALTER TABLE public.orders ALTER COLUMN store_id SET NOT NULL, ALTER COLUMN status SET DEFAULT 'confirmed';
ALTER TABLE public.orders DROP CONSTRAINT orders_store_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT;
ALTER TABLE public.orders ADD CONSTRAINT chk_orders_total_nonnegative CHECK (total_vnd >= 0),
  ADD CONSTRAINT chk_orders_status_valid CHECK (status IN ('pending','confirmed','placed','cancelled','completed'));
ALTER TABLE public.order_items RENAME COLUMN total_price_vnd TO line_total_vnd;
ALTER TABLE public.order_items ADD COLUMN sku_snapshot varchar(100) NOT NULL, ADD COLUMN title_snapshot varchar(255) NOT NULL;
ALTER TABLE public.order_items ADD CONSTRAINT chk_order_items_line_total_nonnegative CHECK (line_total_vnd >= 0);

ALTER TABLE public.support_tickets DROP CONSTRAINT support_tickets_user_id_fkey, DROP CONSTRAINT support_tickets_order_id_fkey;
ALTER TABLE public.support_tickets RENAME COLUMN user_id TO customer_id;
ALTER TABLE public.support_tickets ALTER COLUMN customer_id TYPE varchar(100) USING customer_id::varchar,
  ALTER COLUMN order_id TYPE varchar(100) USING order_id::varchar;
ALTER TABLE public.support_tickets ADD COLUMN ticket_code varchar(50) NOT NULL UNIQUE,
  ADD COLUMN priority varchar(50) NOT NULL DEFAULT 'MEDIUM';

-- Migration history is intentionally not fabricated here. Run the checked-in
-- TypeORM migrations afterwards; they create the remaining missing tables.
COMMIT;
