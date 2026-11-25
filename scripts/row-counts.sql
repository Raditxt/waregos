-- Jumlah baris PERSIS per tabel di skema public (bukan estimasi pg_class).
-- Dipakai restore drill (docs/restore-drill.md) dan bisa dijalankan juga di VPS
-- untuk pembanding. Hanya membaca; aman dijalankan sebagai role apa pun yang boleh SELECT.
--   psql -X -A -F ' ' -t -f row-counts.sql
SELECT table_name,
       (xpath('/row/n/text()',
              query_to_xml(format('SELECT count(*) AS n FROM %I.%I', table_schema, table_name),
                           false, true, '')))[1]::text::bigint AS jumlah
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
