-- Varlık Hafızası — Ortak varlık yönetimi
-- Bir varlık, sahibi tarafından özel bir gruba ortak yönetim için atanabilir.
-- Atama sırasında varlığın sahibi değişmez; yalnızca grubun etkin üyeleri
-- varlık kayıtlarını düzenleme yetkisi kazanır.
--
-- Yalnızca özel gruplar atanabilir; kural API katmanında uygulanır çünkü
-- PostgreSQL CHECK kısıtları başka tabloların satırlarına bakamaz.

BEGIN;

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS manager_community_id uuid
    REFERENCES communities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS assets_manager_community_idx
  ON assets(manager_community_id)
  WHERE manager_community_id IS NOT NULL AND deleted_at IS NULL;

COMMIT;
