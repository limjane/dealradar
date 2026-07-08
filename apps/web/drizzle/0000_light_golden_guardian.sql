CREATE TYPE "public"."deal_status" AS ENUM('active', 'expired');--> statement-breakpoint
CREATE TYPE "public"."subscriber_status" AS ENUM('pending', 'confirmed', 'unsubscribed');--> statement-breakpoint
CREATE TABLE "clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"deal_id" integer,
	"target" text NOT NULL,
	"subscriber_id" integer,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"ua_hash" text
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"baseline_median" numeric(10, 2) NOT NULL,
	"discount_pct" numeric(5, 2) NOT NULL,
	"score" numeric(6, 2) NOT NULL,
	"deep_link_params" jsonb NOT NULL,
	"status" "deal_status" DEFAULT 'active' NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"travel_month" text NOT NULL,
	"cabin" text DEFAULT 'ECONOMY' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"seed_priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"dates" text NOT NULL,
	"results_json" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" "subscriber_status" DEFAULT 'pending' NOT NULL,
	"routes_filter" jsonb,
	"confirm_token" text NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"consent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_cache" ADD CONSTRAINT "search_cache_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clicks_ts_idx" ON "clicks" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "deals_status_route_idx" ON "deals" USING btree ("status","route_id");--> statement-breakpoint
CREATE INDEX "price_snapshots_route_month_idx" ON "price_snapshots" USING btree ("route_id","travel_month","fetched_at");--> statement-breakpoint
CREATE UNIQUE INDEX "routes_origin_destination_idx" ON "routes" USING btree ("origin","destination");--> statement-breakpoint
CREATE UNIQUE INDEX "search_cache_route_dates_idx" ON "search_cache" USING btree ("route_id","dates");