-- Faz 2: toplam depolama, tek dosya boyutu ve varlık başına dosya
-- sınırları artık yazma yollarında gerçekten uygulanıyor. Değerler
-- değiştirilmez; yalnızca modları `enforce` yapılır. Ücretsiz planın
-- 500 MB toplam depolama sınırı (013) böylece etkinleşir.
--
-- Tek dosya boyutu tür bazlıdır: `image`, `video`, `document` kapsamları
-- oluşturulur ama varsayılan olarak pasiftir; pasifken `all` kuralı geçerlidir.
-- Panelden etkinleştirilip değer girildiğinde tür kendi sınırını kullanır.

BEGIN;

UPDATE plan_limit_rules
SET mode = 'enforce', updated_at = now()
WHERE scope = 'all'
  AND limit_key IN ('max_media_per_asset', 'max_file_bytes', 'max_storage_bytes')
  AND mode = 'shadow';

INSERT INTO plan_limit_rules (plan, limit_key, scope, max_value, mode, warning_pct, active)
VALUES
  ('free',    'max_file_bytes', 'image',    NULL, 'enforce', 80, false),
  ('free',    'max_file_bytes', 'video',    NULL, 'enforce', 80, false),
  ('free',    'max_file_bytes', 'document', NULL, 'enforce', 80, false),
  ('premium', 'max_file_bytes', 'image',    NULL, 'enforce', 80, false),
  ('premium', 'max_file_bytes', 'video',    NULL, 'enforce', 80, false),
  ('premium', 'max_file_bytes', 'document', NULL, 'enforce', 80, false)
ON CONFLICT (plan, limit_key, scope) DO NOTHING;

COMMENT ON COLUMN plan_limit_rules.scope IS
  'max_file_bytes için medya türü: all, image, video, document. Diğer limitlerde all.';

COMMIT;
