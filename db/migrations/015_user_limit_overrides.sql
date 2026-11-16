-- Faz 3: Kullanıcıya özel limit istisnaları.
-- Plan kuralından önce uygulanır; böylece tek bir kullanıcıya ek kota
-- verilebilir ya da istisna olarak daha düşük sınır tanımlanabilir.
-- `expires_at` geçmişse kayıt yok sayılır; veri hiçbir durumda silinmez.

BEGIN;

CREATE TABLE user_limit_overrides (
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  limit_key    text NOT NULL,
  scope        text NOT NULL DEFAULT 'all',
  max_value    bigint CHECK (max_value IS NULL OR max_value >= 0),
  mode         text NOT NULL DEFAULT 'enforce' CHECK (mode IN ('enforce', 'warn', 'shadow')),
  warning_pct  integer NOT NULL DEFAULT 80 CHECK (warning_pct BETWEEN 1 AND 100),
  active       boolean NOT NULL DEFAULT true,
  note         text,
  expires_at   timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, limit_key, scope)
);

CREATE INDEX user_limit_overrides_updated_by_idx ON user_limit_overrides (updated_by);

COMMENT ON TABLE user_limit_overrides IS
  'Kullanıcıya özel limit istisnaları. Plan kuralından önce uygulanır; expires_at geçmişse yok sayılır.';
COMMENT ON COLUMN user_limit_overrides.scope IS
  'max_file_bytes için medya türü: all, image, video, document. Diğer limitlerde all.';

COMMIT;
