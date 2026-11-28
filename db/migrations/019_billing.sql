-- Aşama 3: mağaza abonelikleri ve yetkilendirme.
-- Kullanıcı verisi buluta taşınmaz; yalnızca satın alma doğrulaması ve
-- yetki önbelleği tutulur. Abonelik bitince hiçbir kullanıcı verisi silinmez.

BEGIN;

CREATE TABLE store_transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store               text NOT NULL CHECK (store IN ('google', 'apple')),
  product_id          text NOT NULL,
  -- Google'da purchaseToken, Apple'da originalTransactionId.
  transaction_ref     text NOT NULL,
  purchase_at         timestamptz,
  expires_at          timestamptz,
  status              text NOT NULL CHECK (
    status IN ('pending', 'active', 'grace', 'expired', 'refunded', 'revoked')
  ),
  environment         text NOT NULL DEFAULT 'production' CHECK (
    environment IN ('sandbox', 'production')
  ),
  -- Ham mağaza yanıtının özeti; kart/ödeme bilgisi asla saklanmaz.
  verification_result text,
  -- Ham makbuzun SHA-256 özeti; aynı işlemin tekrarını ayırt eder.
  receipt_hash        text,
  last_checked_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_transactions_ref_unique UNIQUE (store, transaction_ref)
);

CREATE INDEX store_transactions_user_idx
  ON store_transactions(user_id, expires_at DESC);
CREATE INDEX store_transactions_status_idx
  ON store_transactions(status, expires_at);

CREATE TABLE subscription_entitlements (
  user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan                user_plan NOT NULL DEFAULT 'free',
  status              text NOT NULL DEFAULT 'none' CHECK (
    status IN ('none', 'active', 'grace', 'expired', 'refunded')
  ),
  source_transaction_id uuid REFERENCES store_transactions(id) ON DELETE SET NULL,
  expires_at          timestamptz,
  verified_at         timestamptz,
  offline_grace_days  integer NOT NULL DEFAULT 7 CHECK (offline_grace_days BETWEEN 0 AND 60),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Webhook ve doğrulama olaylarının denetim izi. Aynı yük iki kez işlenmez.
CREATE TABLE store_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store           text NOT NULL CHECK (store IN ('google', 'apple')),
  event_type      text NOT NULL,
  transaction_ref text,
  payload_hash    text NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz,
  result          text
);

CREATE INDEX store_events_received_idx ON store_events(received_at DESC);
CREATE UNIQUE INDEX store_events_payload_idx ON store_events(store, payload_hash);

-- Mevcut kullanıcılar için boş yetki satırı; plan alanı korunur.
INSERT INTO subscription_entitlements (user_id, plan, status, verified_at)
SELECT id, plan, CASE WHEN plan = 'free' THEN 'none' ELSE 'active' END, now()
FROM users
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
