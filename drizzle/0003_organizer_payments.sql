-- Perfil Organizador + módulo financeiro (Asaas)

ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'organizer';
--> statement-breakpoint
ALTER TYPE "public"."registration_status" ADD VALUE IF NOT EXISTS 'awaiting_payment';
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."organizer_status" AS ENUM('pending', 'approved', 'blocked');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."event_kind" AS ENUM('championship', 'tournament', 'race', 'ride', 'event');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."event_approval_status" AS ENUM('draft', 'pending_review', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."payment_mode" AS ENUM('free', 'pix', 'checkout');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."payment_status" AS ENUM('pending', 'awaiting', 'confirmed', 'received', 'overdue', 'refunded', 'cancelled', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."payment_billing_type" AS ENUM('UNDEFINED', 'PIX', 'CREDIT_CARD', 'BOLETO');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "organizer_profiles" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "status" "organizer_status" DEFAULT 'pending' NOT NULL,
  "display_name" varchar(160) NOT NULL,
  "document" varchar(18),
  "phone" varchar(30),
  "bio" text,
  "asaas_customer_id" varchar(80),
  "asaas_wallet_id" varchar(80),
  "platform_fee_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
  "notes" text,
  "approved_at" timestamp with time zone,
  "approved_by" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(80) NOT NULL,
  "value" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_settings_key_uq" ON "platform_settings" ("key");
--> statement-breakpoint

ALTER TABLE "seasons" ADD COLUMN IF NOT EXISTS "organizer_id" uuid REFERENCES "users"("id") ON DELETE set null;
--> statement-breakpoint

ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "organizer_id" uuid REFERENCES "users"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "kind" "event_kind" DEFAULT 'tournament' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "approval_status" "event_approval_status" DEFAULT 'approved' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "location" varchar(240);
--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "route_info" text;
--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "payment_mode" "payment_mode" DEFAULT 'free' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "price_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "currency" varchar(3) DEFAULT 'BRL' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "payment_due_days" integer DEFAULT 2 NOT NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "event_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE cascade,
  "name" varchar(120) NOT NULL,
  "description" text,
  "min_age" integer,
  "max_age" integer,
  "gender" varchar(20),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "registration_lots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE cascade,
  "name" varchar(120) NOT NULL,
  "price_cents" integer NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "max_quantity" integer,
  "sold_count" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "category_id" uuid REFERENCES "event_categories"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "lot_id" uuid REFERENCES "registration_lots"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "amount_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organizer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE restrict,
  "registration_id" uuid NOT NULL REFERENCES "registrations"("id") ON DELETE restrict,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE restrict,
  "gateway" varchar(40) DEFAULT 'asaas' NOT NULL,
  "gateway_payment_id" varchar(80),
  "gateway_customer_id" varchar(80),
  "billing_type" "payment_billing_type" DEFAULT 'PIX' NOT NULL,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "amount_cents" integer NOT NULL,
  "net_amount_cents" integer,
  "fee_cents" integer,
  "currency" varchar(3) DEFAULT 'BRL' NOT NULL,
  "pix_qr_code" text,
  "pix_copy_paste" text,
  "pix_encoded_image" text,
  "invoice_url" text,
  "due_date" date,
  "paid_at" timestamp with time zone,
  "refunded_at" timestamp with time zone,
  "idempotency_key" varchar(80) NOT NULL,
  "external_reference" varchar(120) NOT NULL,
  "raw_payload" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_uq" ON "payments" ("idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_gateway_payment_uq" ON "payments" ("gateway_payment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_organizer_idx" ON "payments" ("organizer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_tournament_idx" ON "payments" ("tournament_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_registration_idx" ON "payments" ("registration_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" uuid REFERENCES "payments"("id") ON DELETE cascade,
  "gateway_event_id" varchar(120),
  "event_type" varchar(80) NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "processed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_events_gateway_event_uq" ON "payment_events" ("gateway_event_id");
