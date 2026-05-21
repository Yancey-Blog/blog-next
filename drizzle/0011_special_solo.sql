CREATE TABLE "meiji_media" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"milestone" text,
	"taken_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
