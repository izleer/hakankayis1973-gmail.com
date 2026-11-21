-- Plus planının eklenmesi.
-- PostgreSQL enum değeri aynı transaction içinde kullanılamadığı için bu
-- migration yalnızca değeri ekler; tablo ve kota kayıtları sonraki
-- migration'larda yer alır.

BEGIN;

ALTER TYPE user_plan ADD VALUE IF NOT EXISTS 'plus';

COMMIT;
