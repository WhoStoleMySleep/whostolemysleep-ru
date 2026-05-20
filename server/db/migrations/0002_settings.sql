CREATE TABLE "settings" (
    "id" integer PRIMARY KEY DEFAULT 1,
    "open_to_work" boolean NOT NULL DEFAULT true,
    "show_search" boolean NOT NULL DEFAULT true,
    "github_url" text NOT NULL DEFAULT '',
    "telegram_url" text NOT NULL DEFAULT '',
    "email" text NOT NULL DEFAULT '',
    "updated_at" timestamp NOT NULL DEFAULT now()
);
INSERT INTO "settings" ("id", "github_url", "telegram_url", "email")
VALUES (1, 'https://github.com/WhoStoleMySleepDev', 'https://t.me/WhoStoleMySleepDev', 'whostolemysleep@gmail.com')
ON CONFLICT ("id") DO NOTHING;
