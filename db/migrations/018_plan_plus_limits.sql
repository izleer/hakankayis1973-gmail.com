-- Free / Premium / Plus kota değerleri.
-- Ücretli iki kademe (Premium, Plus) aynı özellik ailesini farklı derinlikte
-- sunar; sayısal sınırlar bu tablodan yönetilir. Tek dosya boyutu tüm
-- planlarda NULL bırakılır; genel MAX_UPLOAD_MB sınırı geçerlidir.

BEGIN;

INSERT INTO plan_limit_rules (plan, limit_key, scope, max_value, mode, warning_pct, active)
VALUES
  ('free',    'max_assets',             'all', 5,           'enforce', 80, true),
  ('free',    'max_entries_per_asset',  'all', 10,          'enforce', 80, true),
  ('free',    'max_media_per_entry',    'all', 1,           'enforce', 80, true),
  ('free',    'max_media_per_asset',    'all', 25,          'enforce', 80, true),
  ('free',    'max_file_bytes',         'all', NULL,        'enforce', 80, true),
  ('free',    'max_storage_bytes',      'all', 524288000,   'enforce', 80, true),

  ('premium', 'max_assets',             'all', 50,          'enforce', 80, true),
  ('premium', 'max_entries_per_asset',  'all', 100,         'enforce', 80, true),
  ('premium', 'max_media_per_entry',    'all', 10,          'enforce', 80, true),
  ('premium', 'max_media_per_asset',    'all', 500,         'enforce', 80, true),
  ('premium', 'max_file_bytes',         'all', NULL,        'enforce', 80, true),
  ('premium', 'max_storage_bytes',      'all', 5368709120,  'enforce', 80, true),

  ('plus',    'max_assets',             'all', 250,         'enforce', 80, true),
  ('plus',    'max_entries_per_asset',  'all', 500,         'enforce', 80, true),
  ('plus',    'max_media_per_entry',    'all', 25,          'enforce', 80, true),
  ('plus',    'max_media_per_asset',    'all', 2000,        'enforce', 80, true),
  ('plus',    'max_file_bytes',         'all', NULL,        'enforce', 80, true),
  ('plus',    'max_storage_bytes',      'all', 26843545600, 'enforce', 80, true)
ON CONFLICT (plan, limit_key, scope) DO UPDATE SET
  max_value = EXCLUDED.max_value,
  mode = EXCLUDED.mode,
  warning_pct = EXCLUDED.warning_pct,
  active = EXCLUDED.active,
  updated_at = now();

-- Tür bazlı tek dosya boyutu kuralları pasif başlar; panelden etkinleştirilip
-- değer girildiğinde tür kendi sınırını kullanır.
INSERT INTO plan_limit_rules (plan, limit_key, scope, max_value, mode, warning_pct, active)
VALUES
  ('plus', 'max_file_bytes', 'image',    NULL, 'enforce', 80, false),
  ('plus', 'max_file_bytes', 'video',    NULL, 'enforce', 80, false),
  ('plus', 'max_file_bytes', 'document', NULL, 'enforce', 80, false)
ON CONFLICT (plan, limit_key, scope) DO NOTHING;

COMMIT;
