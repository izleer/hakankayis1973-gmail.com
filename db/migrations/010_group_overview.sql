-- Varlık Hafızası — Panel grup özeti
-- Üyenin grubu en son ne zaman gördüğünü ve gruptan çıkarılan varlıkları izler.

BEGIN;

-- Panelde "okunmamış akış" ve "son ziyaretten beri eklenen/çıkarılan
-- varlık" sayıları bu andan sonrasını sayar.
ALTER TABLE memberships
  ADD COLUMN last_seen_at timestamptz NOT NULL DEFAULT now();

-- Çıkarılma anı ayrı tutulur; kapsam düzenlemesi gibi diğer güncellemeler
-- yanlışlıkla "çıkarıldı" sayılmasın.
ALTER TABLE group_assets
  ADD COLUMN removed_at timestamptz;

UPDATE group_assets
SET removed_at = updated_at
WHERE status = 'removed' AND removed_at IS NULL;

CREATE INDEX group_assets_removed_idx
  ON group_assets(community_id, removed_at DESC)
  WHERE status = 'removed';

COMMIT;
