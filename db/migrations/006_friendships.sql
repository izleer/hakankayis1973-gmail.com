-- Varlık Hafızası — Karşılıklı arkadaşlık ve arkadaşlara açık görünürlük
-- Arkadaşlık iki yönlü kabul gerektirir; varlık sahibi "Arkadaşlar" görünürlüğünü seçtiğinde
-- yalnızca kabul edilmiş arkadaşları varlığı görebilir.

BEGIN;

ALTER TYPE visibility ADD VALUE IF NOT EXISTS 'friends';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'friend_request';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'friend_accept';

CREATE TABLE friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id)
);

-- Aynı iki kişi arasında tek satır tutulur; yön requester/addressee ile ifade edilir.
CREATE UNIQUE INDEX friendships_pair_uidx ON friendships (
  LEAST(requester_id, addressee_id),
  GREATEST(requester_id, addressee_id)
);
CREATE INDEX friendships_requester_idx ON friendships(requester_id, status);
CREATE INDEX friendships_addressee_idx ON friendships(addressee_id, status);

COMMIT;
