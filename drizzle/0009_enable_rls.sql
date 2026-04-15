-- Enable Row Level Security on all public tables.
-- The app connects via DATABASE_URL with the `postgres` role, which BYPASSES RLS,
-- so application behavior is unaffected. This denies all access from Supabase's
-- PostgREST anon/authenticated roles, which the project does not use.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blogs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blog_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
