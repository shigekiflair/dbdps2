CREATE TYPE "public"."betting_round_status" AS ENUM('open', 'closed', 'resolved');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "betting_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"status" "betting_round_status" DEFAULT 'open' NOT NULL,
	"correct_option_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "betting_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"option_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "isAdmin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "betting_rounds" ADD CONSTRAINT "betting_rounds_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "betting_votes" ADD CONSTRAINT "betting_votes_round_id_betting_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."betting_rounds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_favorites" ADD CONSTRAINT "plan_favorites_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "betting_votes_user_round_unique" ON "betting_votes" USING btree ("round_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plan_favorites_user_plan_unique" ON "plan_favorites" USING btree ("plan_id","user_id");