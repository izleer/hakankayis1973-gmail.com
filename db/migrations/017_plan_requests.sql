-- Yönetici onaylı plan yükseltme talepleri.
-- Kullanıcı kendi planını doğrudan değiştiremez; talep oluşturur, admin
-- onayladığında plan yükselir. Aynı kullanıcının aynı anda tek bekleyen
-- talebi olabilir.

BEGIN;

CREATE TABLE plan_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_plan user_plan NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  note           text,
  review_note    text,
  reviewed_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX plan_requests_one_pending_idx
  ON plan_requests(user_id) WHERE status = 'pending';
CREATE INDEX plan_requests_status_idx ON plan_requests(status, created_at DESC);
CREATE INDEX plan_requests_reviewed_by_idx ON plan_requests(reviewed_by);

COMMENT ON TABLE plan_requests IS
  'Kullanıcının plan yükseltme talebi. Plan yalnızca admin onayıyla değişir.';
COMMENT ON COLUMN plan_requests.status IS
  'pending: onay bekliyor, approved/rejected: admin kararı, cancelled: kullanıcı iptal etti.';

COMMIT;
