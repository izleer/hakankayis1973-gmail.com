-- ---------------------------------------------------------------------------
-- Kategori şablonları — kullanıcı tanımlı özel alanlar
--
-- Kategoriye özel alanlar, işlemler ve ölçümler asset_types.attributes_schema
-- içinde konfigürasyon olarak tutulur; her kategori için ayrı tablo açılmaz.
-- Bu migration yalnızca generic varlık modeline kullanıcı özel alanlarını
-- ekler. Hazır şablon kataloğu db/seed.sql içinde yönetilir.
-- ---------------------------------------------------------------------------

BEGIN;

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assets_custom_fields_array'
  ) THEN
    ALTER TABLE assets
      ADD CONSTRAINT assets_custom_fields_array CHECK (jsonb_typeof(custom_fields) = 'array');
  END IF;
END $$;

COMMIT;
