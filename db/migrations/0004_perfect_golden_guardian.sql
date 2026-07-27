CREATE TYPE "public"."betting_mode" AS ENUM('win', 'exacta', 'trifecta');--> statement-breakpoint
CREATE TYPE "public"."point_transaction_reason" AS ENUM('betting_win', 'betting_exacta', 'betting_trifecta');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "point_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" "point_transaction_reason" NOT NULL,
	"plan_id" uuid,
	"round_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "betting_rounds" ADD COLUMN "mode" "betting_mode" DEFAULT 'win' NOT NULL;--> statement-breakpoint
ALTER TABLE "betting_rounds" ADD COLUMN "correct_picks" jsonb;--> statement-breakpoint
ALTER TABLE "betting_votes" ADD COLUMN "picks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "betting_votes" ADD COLUMN "points_awarded" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_round_id_betting_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."betting_rounds"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "betting_rounds" DROP COLUMN IF EXISTS "correct_option_id";--> statement-breakpoint
ALTER TABLE "betting_votes" DROP COLUMN IF EXISTS "option_id";