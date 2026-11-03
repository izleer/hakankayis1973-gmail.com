-- Varlık Hafızası — Gruplar ve topluluk modülü (Faz 1)
-- Varlık sahipliği korunur; grup yalnızca sahibinin izin verdiği kapsamı görür.

BEGIN;

-- Grup yönetimi rolleri ve bildirim türleri
ALTER TYPE community_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'community_invite';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'community_request';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'community_approved';

CREATE TYPE community_join_policy AS ENUM ('open', 'approval');
CREATE TYPE membership_status AS ENUM ('active', 'pending');
CREATE TYPE group_asset_scope AS ENUM ('summary', 'timeline', 'all');
CREATE TYPE group_asset_status AS ENUM ('active', 'removed');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'revoked');

-- Grubun kimliği ve katılım modeli
ALTER TABLE communities
  ADD COLUMN category text CHECK (category IS NULL OR char_length(category) <= 60),
  ADD COLUMN rules text CHECK (rules IS NULL OR char_length(rules) <= 2000),
  ADD COLUMN join_policy community_join_policy NOT NULL DEFAULT 'open';

-- Üyelik artık onay bekleyebilir
ALTER TABLE memberships
  ADD COLUMN status membership_status NOT NULL DEFAULT 'active',
  ADD COLUMN invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX memberships_pending_idx
  ON memberships(community_id, joined_at)
  WHERE status = 'pending';

-- Bir varlık birden fazla grupta, her grupta farklı kapsamla yer alabilir.
CREATE TABLE group_assets (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id       uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  asset_id           uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  added_by_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility_scope   group_asset_scope NOT NULL DEFAULT 'summary',
  status             group_asset_status NOT NULL DEFAULT 'active',
  shared_at          timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, asset_id)
);
CREATE INDEX group_assets_community_idx
  ON group_assets(community_id, shared_at DESC) WHERE status = 'active';
CREATE INDEX group_assets_asset_idx
  ON group_assets(asset_id) WHERE status = 'active';

-- Davetler
CREATE TABLE group_invitations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id   uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  inviter_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         invitation_status NOT NULL DEFAULT 'pending',
  created_at     timestamptz NOT NULL DEFAULT now(),
  responded_at   timestamptz,
  expires_at     timestamptz NOT NULL DEFAULT now() + interval '14 days'
);
CREATE UNIQUE INDEX group_invitations_one_pending_idx
  ON group_invitations(community_id, invitee_id) WHERE status = 'pending';
CREATE INDEX group_invitations_invitee_idx
  ON group_invitations(invitee_id, created_at DESC);

CREATE TRIGGER memberships_touch BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER group_assets_touch BEFORE UPDATE ON group_assets
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMIT;
