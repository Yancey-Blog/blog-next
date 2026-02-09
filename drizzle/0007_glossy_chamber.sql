ALTER TABLE "blogs" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN "like" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN "pv" integer DEFAULT 0 NOT NULL;