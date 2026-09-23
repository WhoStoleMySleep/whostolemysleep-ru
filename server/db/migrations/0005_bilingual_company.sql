-- Место работы становится двуязычным: в английской версии резюме название компании
-- оставалось русским. Переименование, а не новая колонка — данные уже лежат в company.
ALTER TABLE "experience" RENAME COLUMN "company" TO "company_ru";--> statement-breakpoint
ALTER TABLE "experience" ADD COLUMN IF NOT EXISTS "company_en" varchar(255) DEFAULT '' NOT NULL;
