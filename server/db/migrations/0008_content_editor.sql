CREATE TYPE "public"."content_environment" AS ENUM('development', 'preview', 'production');--> statement-breakpoint
CREATE TYPE "public"."content_plan_status" AS ENUM('pending', 'approved', 'applied');--> statement-breakpoint
CREATE TYPE "public"."content_resource" AS ENUM('pages', 'post', 'about', 'settings', 'experience', 'education', 'skill', 'skill-group');--> statement-breakpoint
CREATE TABLE "content_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"environment" "content_environment" NOT NULL,
	"plan_id" uuid NOT NULL,
	"resource" "content_resource" NOT NULL,
	"record_id" integer NOT NULL,
	"actor" text NOT NULL,
	"approved_by" text NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_history_plan_id_unique" UNIQUE("plan_id")
);
--> statement-breakpoint
CREATE TABLE "content_plan" (
	"id" uuid PRIMARY KEY NOT NULL,
	"environment" "content_environment" NOT NULL,
	"resource" "content_resource" NOT NULL,
	"record_id" integer NOT NULL,
	"actor" text NOT NULL,
	"token_id" uuid,
	"version" varchar(64) NOT NULL,
	"expected_state" jsonb NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"diff" jsonb NOT NULL,
	"status" "content_plan_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_token" (
	"id" uuid PRIMARY KEY NOT NULL,
	"environment" "content_environment" NOT NULL,
	"label" varchar(100) NOT NULL,
	"secret_hash" varchar(64) NOT NULL,
	"resources" jsonb NOT NULL,
	"scopes" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_token_secret_hash_unique" UNIQUE("secret_hash")
);
--> statement-breakpoint
CREATE TABLE "page_content" (
	"environment" "content_environment" PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{"ru":{},"en":{}}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_history" ADD CONSTRAINT "content_history_plan_id_content_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."content_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_plan" ADD CONSTRAINT "content_plan_token_id_content_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."content_token"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_history_record_idx" ON "content_history" USING btree ("environment","resource","record_id");--> statement-breakpoint
CREATE INDEX "content_plan_environment_created_idx" ON "content_plan" USING btree ("environment","created_at");--> statement-breakpoint
CREATE INDEX "content_token_environment_idx" ON "content_token" USING btree ("environment");--> statement-breakpoint
INSERT INTO "page_content" ("environment") VALUES ('development'), ('preview'), ('production');