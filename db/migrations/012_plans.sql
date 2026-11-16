-- Free / Premium plan tanımı.
-- Plan yalnızca yetkilendirme sınırlarını belirler; mevcut kayıtlar silinmez.
-- Limit aşımında yeni yazma reddedilir, okuma ve dışa aktarma her planda açıktır.

BEGIN;

CREATE TYPE user_plan AS ENUM ('free', 'premium');

ALTER TABLE users
  ADD COLUMN plan user_plan NOT NULL DEFAULT 'free',
  ADD COLUMN plan_started_at timestamptz;

CREATE INDEX users_plan_idx ON users(plan) WHERE deleted_at IS NULL;

COMMIT;
