CREATE TABLE "pending_revalidation" (
	"path" text PRIMARY KEY NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
