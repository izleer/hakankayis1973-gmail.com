-- Varlık Hafızası — Bakım ve hatırlatma sistemi
-- Hatırlatma bir iz girişidir (journal_entries.type = 'reminder') ve ileri bir
-- tarih/saat taşır. Zamanı gelince kullanıcıya bildirim üretilir.
--
-- PostgreSQL yeni enum değerinin aynı işlem içinde kullanılmasına izin vermez;
-- bu yüzden enum eklemeleri ayrı bir işlemde tamamlanır.

BEGIN;

ALTER TYPE entry_type ADD VALUE IF NOT EXISTS 'reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'reminder';

COMMIT;

BEGIN;

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_done_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_notified_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entries_reminder_due'
  ) THEN
    ALTER TABLE journal_entries
      ADD CONSTRAINT entries_reminder_due CHECK (
        type <> 'reminder' OR due_at IS NOT NULL
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS entries_reminder_due_idx
  ON journal_entries (due_at)
  WHERE type = 'reminder'
    AND deleted_at IS NULL
    AND reminder_notified_at IS NULL
    AND reminder_done_at IS NULL;

COMMIT;
