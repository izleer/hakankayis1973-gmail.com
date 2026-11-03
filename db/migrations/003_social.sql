-- Varlık Hafızası — Facebook / Instagram bağlantıları ve paylaşım kayıtları
-- Sayfa jetonları şifreli saklanır; paylaşım geçmişi kullanıcıya görünür.

BEGIN;

CREATE TYPE social_provider AS ENUM ('facebook', 'instagram');
CREATE TYPE social_share_format AS ENUM ('post', 'story', 'reel');
CREATE TYPE social_share_status AS ENUM ('pending', 'published', 'failed');

CREATE TABLE social_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          social_provider NOT NULL,
  external_id       text NOT NULL,
  account_name      text NOT NULL,
  account_username  text,
  page_id           text NOT NULL,
  page_name         text NOT NULL,
  token_cipher      text NOT NULL,
  token_expires_at  timestamptz,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, external_id)
);
CREATE INDEX social_connections_user_idx ON social_connections(user_id, created_at DESC);

CREATE TABLE social_shares (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id       uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  connection_id  uuid REFERENCES social_connections(id) ON DELETE SET NULL,
  provider       social_provider NOT NULL,
  format         social_share_format NOT NULL,
  status         social_share_status NOT NULL DEFAULT 'pending',
  caption        text CHECK (caption IS NULL OR char_length(caption) <= 2200),
  media_id       uuid REFERENCES media(id) ON DELETE SET NULL,
  external_id    text,
  permalink      text,
  error          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  published_at   timestamptz
);
CREATE INDEX social_shares_user_idx ON social_shares(user_id, created_at DESC);
CREATE INDEX social_shares_asset_idx ON social_shares(asset_id, created_at DESC);

CREATE TRIGGER social_connections_touch BEFORE UPDATE ON social_connections
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMIT;
