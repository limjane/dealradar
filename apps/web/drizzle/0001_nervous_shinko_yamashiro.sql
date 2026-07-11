CREATE TABLE "fare_calendar" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"depart_date" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fare_calendar" ADD CONSTRAINT "fare_calendar_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fare_calendar_route_date_idx" ON "fare_calendar" USING btree ("route_id","depart_date","fetched_at");