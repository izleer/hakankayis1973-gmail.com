-- Varlık Hafızası Platformu — MVP şeması (PostgreSQL 16+)
-- Tüm zaman damgaları UTC saklanır. Uygulama erişim kontrolü API katmanındadır.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE visibility AS ENUM ('private', 'selected', 'public');
CREATE TYPE asset_status AS ENUM ('active', 'archived');
CREATE TYPE ownership_status AS ENUM ('active', 'ended');
CREATE TYPE entry_type AS ENUM (
  'note', 'photo', 'maintenance', 'acquisition', 'measurement', 'health', 'event', 'document'
);
CREATE TYPE media_kind AS ENUM ('image', 'video', 'document');
CREATE TYPE media_status AS ENUM ('pending', 'ready', 'failed');
CREATE TYPE content_status AS ENUM ('visible', 'hidden', 'deleted');
CREATE TYPE post_audience AS ENUM ('public', 'community');
CREATE TYPE community_role AS ENUM ('member', 'moderator', 'owner');
CREATE TYPE community_visibility AS ENUM ('public', 'private');
CREATE TYPE notification_type AS ENUM (
  'follow', 'like', 'comment', 'community_join', 'community_post', 'system'
);
CREATE TYPE report_target_type AS ENUM ('post', 'comment', 'user', 'asset', 'entry');
CREATE TYPE report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
CREATE TYPE access_resource_type AS ENUM ('asset', 'entry');

-- ---------------------------------------------------------------------------
-- Hesaplar
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext NOT NULL UNIQUE,
  username        citext NOT NULL UNIQUE,
  password_hash   text NOT NULL,
  display_name    text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  bio             text CHECK (char_length(bio) <= 500),
  avatar_url      text,
  role            user_role NOT NULL DEFAULT 'user',
  interests       text[] NOT NULL DEFAULT '{}',
  onboarded_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT users_username_format CHECK (username::text ~ '^[a-z0-9_]{3,30}$'),
  CONSTRAINT users_email_format CHECK (position('@' in email::text) > 1)
);

CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    text NOT NULL UNIQUE,
  user_agent    text CHECK (char_length(user_agent) <= 500),
  ip            inet,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz
);
CREATE INDEX sessions_user_idx ON sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX sessions_expiry_idx ON sessions(expires_at) WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- Varlık kategorileri
-- ---------------------------------------------------------------------------
CREATE TABLE asset_types (
  id                text PRIMARY KEY,
  parent_id         text REFERENCES asset_types(id) ON DELETE RESTRICT,
  label             text NOT NULL,
  icon              text,
  sort_order        integer NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  attributes_schema jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Topluluklar
-- ---------------------------------------------------------------------------
CREATE TABLE communities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            citext NOT NULL UNIQUE,
  name            text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  description     text CHECK (char_length(description) <= 1000),
  cover_url       text,
  cover_media_id  uuid,
  owner_id        uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  visibility      community_visibility NOT NULL DEFAULT 'public',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT communities_slug_format CHECK (slug::text ~ '^[a-z0-9-]{3,60}$')
);
CREATE INDEX communities_owner_idx ON communities(owner_id);
CREATE INDEX communities_name_trgm_idx ON communities USING gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Varlıklar ve sahiplik
-- ---------------------------------------------------------------------------
CREATE TABLE assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type_id         text NOT NULL REFERENCES asset_types(id) ON DELETE RESTRICT,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description     text CHECK (char_length(description) <= 2000),
  cover_url       text,
  cover_media_id  uuid,
  visibility      visibility NOT NULL DEFAULT 'private',
  status          asset_status NOT NULL DEFAULT 'active',
  attributes      jsonb NOT NULL DEFAULT '{}'::jsonb,
  location_name   text CHECK (char_length(location_name) <= 160),
  latitude        numeric(9, 6) CHECK (latitude BETWEEN -90 AND 90),
  longitude       numeric(9, 6) CHECK (longitude BETWEEN -180 AND 180),
  acquired_at     date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT assets_location_pair CHECK (
    (latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  )
);
CREATE INDEX assets_owner_idx ON assets(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX assets_type_idx ON assets(type_id) WHERE deleted_at IS NULL;
CREATE INDEX assets_visibility_idx ON assets(visibility) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX assets_title_trgm_idx ON assets USING gin (title gin_trgm_ops);
CREATE INDEX assets_updated_idx ON assets(updated_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE ownerships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status      ownership_status NOT NULL DEFAULT 'active',
  started_at  date NOT NULL DEFAULT CURRENT_DATE,
  ended_at    date,
  note        text CHECK (char_length(note) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ownerships_dates CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX ownerships_one_active_idx ON ownerships(asset_id) WHERE status = 'active';
CREATE INDEX ownerships_owner_idx ON ownerships(owner_id, status);

-- ---------------------------------------------------------------------------
-- Görünürlük kuralları (seçili kişiler)
-- ---------------------------------------------------------------------------
CREATE TABLE access_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type  access_resource_type NOT NULL,
  resource_id    uuid NOT NULL,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission     text NOT NULL DEFAULT 'view' CHECK (permission IN ('view')),
  created_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_type, resource_id, user_id)
);
CREATE INDEX access_rules_user_idx ON access_rules(user_id, resource_type);

-- ---------------------------------------------------------------------------
-- Varlık geçmişi
-- ---------------------------------------------------------------------------
CREATE TABLE journal_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  author_id      uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type           entry_type NOT NULL DEFAULT 'note',
  title          text CHECK (char_length(title) <= 140),
  body           text CHECK (char_length(body) <= 5000),
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  visibility     visibility NOT NULL DEFAULT 'private',
  location_name  text CHECK (char_length(location_name) <= 160),
  latitude       numeric(9, 6) CHECK (latitude BETWEEN -90 AND 90),
  longitude      numeric(9, 6) CHECK (longitude BETWEEN -180 AND 180),
  attributes     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  CONSTRAINT entries_content CHECK (
    (body IS NOT NULL AND char_length(btrim(body)) > 0) OR title IS NOT NULL
  ),
  CONSTRAINT entries_location_pair CHECK (
    (latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  )
);
CREATE INDEX entries_asset_timeline_idx ON journal_entries(asset_id, occurred_at DESC, id DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX entries_author_idx ON journal_entries(author_id) WHERE deleted_at IS NULL;
CREATE INDEX entries_occurred_idx ON journal_entries(occurred_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE asset_measurements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  entry_id    uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  metric      text NOT NULL CHECK (char_length(metric) BETWEEN 1 AND 60),
  value       numeric NOT NULL,
  unit        text NOT NULL CHECK (char_length(unit) BETWEEN 1 AND 20),
  measured_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX measurements_asset_idx ON asset_measurements(asset_id, metric, measured_at DESC);

-- ---------------------------------------------------------------------------
-- Medya
-- ---------------------------------------------------------------------------
CREATE TABLE media (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind           media_kind NOT NULL,
  status         media_status NOT NULL DEFAULT 'pending',
  storage_key    text UNIQUE,
  original_name  text,
  mime_type      text NOT NULL,
  byte_size      bigint NOT NULL CHECK (byte_size >= 0),
  width          integer CHECK (width IS NULL OR width > 0),
  height         integer CHECK (height IS NULL OR height > 0),
  asset_id       uuid REFERENCES assets(id) ON DELETE CASCADE,
  entry_id       uuid REFERENCES journal_entries(id) ON DELETE CASCADE,
  post_id        uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_asset_idx ON media(asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX media_entry_idx ON media(entry_id) WHERE entry_id IS NOT NULL;
CREATE INDEX media_owner_idx ON media(owner_id);

-- ---------------------------------------------------------------------------
-- Sosyal içerik
-- ---------------------------------------------------------------------------
CREATE TABLE posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id      uuid REFERENCES assets(id) ON DELETE SET NULL,
  entry_id      uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  community_id  uuid REFERENCES communities(id) ON DELETE CASCADE,
  audience      post_audience NOT NULL DEFAULT 'public',
  body          text NOT NULL DEFAULT '' CHECK (char_length(body) <= 3000),
  status        content_status NOT NULL DEFAULT 'visible',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_has_content CHECK (
    asset_id IS NOT NULL OR entry_id IS NOT NULL OR char_length(btrim(body)) > 0
  ),
  CONSTRAINT posts_audience_target CHECK (
    (audience = 'community' AND community_id IS NOT NULL) OR
    (audience = 'public' AND community_id IS NULL)
  )
);
CREATE INDEX posts_feed_idx ON posts(created_at DESC, id DESC) WHERE status = 'visible';
CREATE INDEX posts_author_idx ON posts(author_id, created_at DESC) WHERE status = 'visible';
CREATE INDEX posts_community_idx ON posts(community_id, created_at DESC) WHERE status = 'visible';
CREATE INDEX posts_asset_idx ON posts(asset_id) WHERE asset_id IS NOT NULL;

ALTER TABLE media
  ADD CONSTRAINT media_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

CREATE TABLE likes (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX likes_post_idx ON likes(post_id);

CREATE TABLE comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES comments(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  status      content_status NOT NULL DEFAULT 'visible',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX comments_post_idx ON comments(post_id, created_at) WHERE deleted_at IS NULL;

CREATE TABLE follows (
  follower_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_not_self CHECK (follower_id <> following_id)
);
CREATE INDEX follows_following_idx ON follows(following_id);

CREATE TABLE memberships (
  community_id  uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          community_role NOT NULL DEFAULT 'member',
  joined_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);
CREATE INDEX memberships_user_idx ON memberships(user_id);

-- ---------------------------------------------------------------------------
-- Güvenlik / bildirim / denetim
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  type         notification_type NOT NULL,
  entity_type  text,
  entity_id    uuid,
  message      text CHECK (char_length(message) <= 300),
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_inbox_idx ON notifications(user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications(user_id) WHERE read_at IS NULL;

CREATE TABLE blocks (
  blocker_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocks_not_self CHECK (blocker_id <> blocked_id)
);
CREATE INDEX blocks_blocked_idx ON blocks(blocked_id);

CREATE TABLE reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type     report_target_type NOT NULL,
  target_id       uuid NOT NULL,
  reason          text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 120),
  details         text CHECK (char_length(details) <= 2000),
  status          report_status NOT NULL DEFAULT 'open',
  handled_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  handled_at      timestamptz,
  resolution_note text CHECK (char_length(resolution_note) <= 1000),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_queue_idx ON reports(status, created_at);
CREATE UNIQUE INDEX reports_one_open_idx ON reports(reporter_id, target_type, target_id)
  WHERE status IN ('open', 'reviewing');

CREATE TABLE audit_events (
  id           bigserial PRIMARY KEY,
  actor_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  action       text NOT NULL,
  entity_type  text,
  entity_id    uuid,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip           inet,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_entity_idx ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX audit_actor_idx ON audit_events(actor_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Foreign key'ler (döngüsel ilişkiler)
-- ---------------------------------------------------------------------------
ALTER TABLE assets
  ADD CONSTRAINT assets_cover_media_fk FOREIGN KEY (cover_media_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE communities
  ADD CONSTRAINT communities_cover_media_fk FOREIGN KEY (cover_media_id) REFERENCES media(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Yardımcı tetikleyiciler
-- ---------------------------------------------------------------------------
CREATE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER assets_touch BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER entries_touch BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER posts_touch BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER comments_touch BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER communities_touch BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Her varlık için aktif sahiplik kaydı oluştur.
CREATE FUNCTION ensure_asset_ownership() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO ownerships (asset_id, owner_id, started_at, status)
  VALUES (NEW.id, NEW.owner_id, COALESCE(NEW.acquired_at, CURRENT_DATE), 'active')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assets_ownership AFTER INSERT ON assets
  FOR EACH ROW EXECUTE FUNCTION ensure_asset_ownership();

COMMIT;
