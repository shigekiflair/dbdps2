CREATE TYPE "public"."character_role" AS ENUM('killer', 'survivor');--> statement-breakpoint
CREATE TYPE "public"."plan_target" AS ENUM('survivor', 'killer', 'both', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('lottery', 'roleplay', 'chain', 'tracking', 'data_accumulation', 'escalation', 'target_pick', 'trigger_internal', 'draft', 'betting');--> statement-breakpoint
CREATE TYPE "public"."rarity" AS ENUM('common', 'uncommon', 'rare', 'very_rare', 'ultra_rare', 'event');--> statement-breakpoint
CREATE TYPE "public"."state_model" AS ENUM('stateless', 'session_persistent', 'cross_stream_persistent');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rarity" "rarity" NOT NULL,
	"icon_url" text,
	"killer_id" uuid,
	"item_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"role" character_role NOT NULL,
	"icon_url" text,
	"chapter" text,
	"released_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"icon_url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"realm" text,
	"icon_url" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rarity" "rarity" NOT NULL,
	"icon_url" text,
	"role" "plan_target" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "perks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"role" character_role NOT NULL,
	"origin_character_id" uuid,
	"icon_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"progress_payload" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" uuid,
	"share_code" text,
	"result_payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "plan_type" NOT NULL,
	"target" "plan_target" NOT NULL,
	"pool_config" jsonb,
	"input_fields" jsonb,
	"output_display" jsonb,
	"state_model" "state_model" DEFAULT 'stateless' NOT NULL,
	"progress_config" jsonb,
	"is_published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taggables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag_id" uuid NOT NULL,
	"taggable_type" text NOT NULL,
	"taggable_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"color" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "addons" ADD CONSTRAINT "addons_killer_id_characters_id_fk" FOREIGN KEY ("killer_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "addons" ADD CONSTRAINT "addons_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "perks" ADD CONSTRAINT "perks_origin_character_id_characters_id_fk" FOREIGN KEY ("origin_character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_progress" ADD CONSTRAINT "plan_progress_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_results" ADD CONSTRAINT "plan_results_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "taggables" ADD CONSTRAINT "taggables_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "addons_slug_unique" ON "addons" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "characters_slug_unique" ON "characters" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "items_slug_unique" ON "items" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "maps_slug_unique" ON "maps" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "offerings_slug_unique" ON "offerings" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "perks_slug_unique" ON "perks" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plan_progress_user_plan_unique" ON "plan_progress" USING btree ("plan_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plan_results_share_code_unique" ON "plan_results" USING btree ("share_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plans_slug_unique" ON "plans" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "taggables_unique" ON "taggables" USING btree ("tag_id","taggable_type","taggable_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tags_slug_unique" ON "tags" USING btree ("slug");