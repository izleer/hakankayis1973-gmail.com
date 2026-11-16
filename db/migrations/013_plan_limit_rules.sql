-- Plan sınırlarının yönetilebilir hâli.
-- API etkin değerleri bu tablodan okur; tabloya ulaşılamazsa koddaki
-- varsayılanlar kullanılır. `mode` her limitin nasıl uygulanacağını belirler:
--   enforce → sınır aşılırsa yazma reddedilir
--   warn    → işleme izin verilir, kullanıcı bilgilendirilir (Faz 3)
--   shadow  → yalnızca ölçülür, kullanıcıya yansımaz
-- Mevcut kullanıcı verileri hiçbir modda silinmez.

BEGIN;

CREATE TABLE plan_limit_rules (
  plan         user_plan NOT NULL,
  limit_key    text NOT NULL,
  scope        text NOT NULL DEFAULT 'all',
  max_value    bigint CHECK (max_value IS NULL OR max_value >= 0),
  mode         text NOT NULL DEFAULT 'enforce' CHECK (mode IN ('enforce', 'warn', 'shadow')),
  warning_pct  integer NOT NULL DEFAULT 80 CHECK (warning_pct BETWEEN 1 AND 100),
  active       boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (plan, limit_key, scope)
);

COMMENT ON TABLE plan_limit_rules IS
  'Paket bazlı yönetilebilir sınırlar. max_value NULL ise sınırsız.';
COMMENT ON COLUMN plan_limit_rules.scope IS
  'Tek dosya boyutunda medya türü (image/pdf/other); diğer limitlerde all.';

INSERT INTO plan_limit_rules (plan, limit_key, max_value, mode) VALUES
  -- Ücretsiz plan: mevcut değerler korunur. Toplam depolama 500 MB olarak
  -- tanımlanır ancak uygulaması Faz 2'de geldiği için shadow modunda durur.
  ('free', 'max_assets',             5,          'enforce'),
  ('free', 'max_entries_per_asset',  10,         'enforce'),
  ('free', 'max_media_per_entry',    1,          'enforce'),
  ('free', 'max_media_per_asset',    NULL,       'shadow'),
  ('free', 'max_file_bytes',         NULL,       'shadow'),
  ('free', 'max_storage_bytes',      524288000,  'shadow'),

  -- Premium: mevcut değerler korunur.
  ('premium', 'max_assets',             NULL, 'enforce'),
  ('premium', 'max_entries_per_asset',  NULL, 'enforce'),
  ('premium', 'max_media_per_entry',    10,   'enforce'),
  ('premium', 'max_media_per_asset',    NULL, 'shadow'),
  ('premium', 'max_file_bytes',         NULL, 'shadow'),
  ('premium', 'max_storage_bytes',      NULL, 'shadow')
ON CONFLICT (plan, limit_key, scope) DO NOTHING;

COMMIT;
