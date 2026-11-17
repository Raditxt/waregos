-- Bootstrap role database Waregos (ADR 0006). Jalankan SEKALI sebagai superuser
-- `postgres` pada database `waregos` yang masih kosong. Caranya (salin ke
-- container dengan `dc cp`, lalu `psql -f`) ada di deploy/README.md bagian
-- "Pertama kali".
--
-- File ini TIDAK berisi password. Setelah selesai, set password tiap role
-- dengan tangan (lihat deploy/README.md), sama persis dengan isi .env.
-- Aman dijalankan ulang.

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'waregos_owner') THEN
    CREATE ROLE waregos_owner LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'waregos_app') THEN
    CREATE ROLE waregos_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'waregos_backup') THEN
    CREATE ROLE waregos_backup LOGIN;
  END IF;
END
$$;

-- Database dan skema dimiliki waregos_owner.
ALTER DATABASE waregos OWNER TO waregos_owner;
ALTER SCHEMA public OWNER TO waregos_owner;
-- Catatan VM-01: tanpa ini restore sebagai waregos_owner gagal membuat tabel.
GRANT CREATE ON SCHEMA public TO waregos_owner;

-- Tidak ada akses default untuk PUBLIC.
REVOKE ALL ON DATABASE waregos FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE waregos TO waregos_owner, waregos_app, waregos_backup;

-- Aplikasi: DML saja, tanpa CREATE/DROP/TRUNCATE.
GRANT USAGE ON SCHEMA public TO waregos_app;
-- Backup: baca saja.
GRANT USAGE ON SCHEMA public TO waregos_backup;

-- Objek yang SUDAH ada (kosong saat bootstrap; berguna kalau file ini diulang).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO waregos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO waregos_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO waregos_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO waregos_backup;

-- Objek yang NANTI dibuat waregos_owner (migrasi, restore): grant otomatis.
ALTER DEFAULT PRIVILEGES FOR ROLE waregos_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO waregos_app;
ALTER DEFAULT PRIVILEGES FOR ROLE waregos_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO waregos_app;
ALTER DEFAULT PRIVILEGES FOR ROLE waregos_owner IN SCHEMA public
  GRANT SELECT ON TABLES TO waregos_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE waregos_owner IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO waregos_backup;