CREATE TYPE "public"."post_type" AS ENUM('blog', 'project');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'viewer');--> statement-breakpoint
CREATE TABLE "about_me" (
	"id" serial PRIMARY KEY NOT NULL,
	"text_ru" text NOT NULL,
	"text_en" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" serial PRIMARY KEY NOT NULL,
	"institution" varchar(255) NOT NULL,
	"specialization_ru" varchar(255) NOT NULL,
	"specialization_en" varchar(255) DEFAULT '' NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience" (
	"id" serial PRIMARY KEY NOT NULL,
	"company" varchar(255) NOT NULL,
	"position_ru" varchar(255) NOT NULL,
	"position_en" varchar(255) DEFAULT '' NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_bullet" (
	"id" serial PRIMARY KEY NOT NULL,
	"experience_id" integer NOT NULL,
	"text_ru" text NOT NULL,
	"text_en" text DEFAULT '' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "image" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"url" varchar(1000) NOT NULL,
	"alt_ru" varchar(500) DEFAULT '' NOT NULL,
	"alt_en" varchar(500) DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"type" "post_type" NOT NULL,
	"title_ru" varchar(500) NOT NULL,
	"title_en" varchar(500) DEFAULT '' NOT NULL,
	"text_ru" text NOT NULL,
	"text_en" text DEFAULT '' NOT NULL,
	"excerpt_ru" text NOT NULL,
	"excerpt_en" text DEFAULT '' NOT NULL,
	"url" varchar(1000),
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_tag" (
	"post_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "post_tag_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "skill" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name_ru" varchar(100) NOT NULL,
	"name_en" varchar(100) DEFAULT '' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "skill_group_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name_ru" varchar(100) NOT NULL,
	"name_en" varchar(100) DEFAULT '' NOT NULL,
	CONSTRAINT "tag_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "experience_bullet" ADD CONSTRAINT "experience_bullet_experience_id_experience_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experience"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image" ADD CONSTRAINT "image_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tag" ADD CONSTRAINT "post_tag_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tag" ADD CONSTRAINT "post_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill" ADD CONSTRAINT "skill_group_id_skill_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."skill_group"("id") ON DELETE cascade ON UPDATE no action;