CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "blogs" DROP CONSTRAINT "blogs_slug_unique";--> statement-breakpoint
ALTER TABLE "blogs" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "blogs" DROP COLUMN "preview";