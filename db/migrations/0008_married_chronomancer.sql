CREATE TYPE "public"."tag_category" AS ENUM('perk_attribute', 'plan_genre');--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "category" "tag_category" DEFAULT 'perk_attribute' NOT NULL;