-- Supabase, public şemasını Data API (PostgREST) üzerinden anon ve
-- authenticated rollerine açar. Uygulama verisi yalnızca API üzerinden
-- erişilmeli; bu migration REST erişimini kapatır.
--
-- API, tabloların sahibi olan rolle (Supabase'de postgres) bağlandığı için
-- RLS'den etkilenmez. Supabase dışındaki PostgreSQL kurulumlarında anon /
-- authenticated rolleri bulunmadığından blok sessizce geçer.
DO $$
DECLARE
  item record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RETURN;
  END IF;

  -- Satır düzeyi güvenliği aç (politika yok: anon/authenticated için erişim
  -- tamamen kapalı; tablo sahibi olan API rolü muaf).
  FOR item IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.tablename);
  END LOOP;

  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
  REVOKE CREATE ON SCHEMA public FROM anon, authenticated;

  -- PostgreSQL fonksiyonlarda EXECUTE'u varsayılan olarak PUBLIC'e verir;
  -- Data API'nin RPC üzerinden uygulama fonksiyonlarını çağırmasını engelle.
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

  -- Sonraki migration'larla eklenecek nesneler de varsayılan olarak kapalı olsun;
  -- Supabase'in otomatik verdiği yetkiler geri alınır.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
END $$;
