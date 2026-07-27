CREATE TYPE "public"."plan_visibility" AS ENUM('private', 'unlisted', 'public');--> statement-breakpoint
ALTER TYPE "public"."plan_type" ADD VALUE 'tier_list';--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "visibility" "plan_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plans" ADD CONSTRAINT "plans_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
