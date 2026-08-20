-- Внешний id поста в публикаторе: по нему повторная отправка обновляет запись, а не дублирует.
-- Таблица settings в снапшот попала задним числом (её завела ручная миграция 0002) — здесь её нет намеренно.
ALTER TABLE "post" ADD COLUMN IF NOT EXISTS "external_id" varchar(64);--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_external_id_unique" UNIQUE("external_id");
