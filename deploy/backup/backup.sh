#!/bin/sh
# Backup database Waregos: dump -> verifikasi -> enkripsi age -> unggah R2 -> ping healthchecks.
# Dijalankan di dalam image waregos-backup lewat `docker compose run --rm backup` (ADR 0007).
#
# Plaintext dump hanya boleh ada di /work, yang harus tmpfs (dicek di bawah).
# Koneksi Postgres dari env standar libpq: PGHOST, PGUSER, PGPASSWORD, PGDATABASE.
# R2 dari env RCLONE_CONFIG_R2_* (tidak ada file konfigurasi rclone di disk).
set -eu
umask 077

WORK=/work
STEP=persiapan

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

# hc <akhiran> [pesan]: ping healthchecks.io. Gagal ping tidak menggagalkan backup;
# kalau ping sukses tidak sampai, healthchecks sendiri yang membunyikan alarm.
hc() {
  [ -n "${HEALTHCHECK_URL:-}" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null --data-raw "${2:-}" "${HEALTHCHECK_URL}$1" \
    || log "peringatan: ping healthchecks gagal ($1)"
}

bersihkan() {
  rm -f "$WORK/db.dump" "$WORK/toc.txt" "$WORK"/*.dump.age
}

selesai() {
  status=$?
  bersihkan
  if [ "$status" -ne 0 ]; then
    log "GAGAL di langkah: $STEP (exit $status)"
    hc /fail "gagal di langkah: $STEP (exit $status)"
  fi
  exit "$status"
}
trap selesai EXIT
trap 'exit 130' INT TERM

gagal() {
  log "$*"
  exit 1
}

# --- 1. Konfigurasi --------------------------------------------------------
STEP="cek konfigurasi"
for v in PGHOST PGUSER PGPASSWORD PGDATABASE AGE_RECIPIENT R2_BUCKET HEALTHCHECK_URL \
         RCLONE_CONFIG_R2_TYPE; do
  eval "nilai=\${$v:-}"
  [ -n "$nilai" ] || gagal "variabel $v kosong (isi di .env)"
done
case "$AGE_RECIPIENT" in
  age1*) ;;
  *) gagal "AGE_RECIPIENT bukan kunci publik age (harus diawali age1)" ;;
esac
# Plaintext tidak boleh menyentuh disk: tolak jalan kalau /work bukan tmpfs.
awk -v d="$WORK" '$2 == d && $3 == "tmpfs" { ok = 1 } END { exit !ok }' /proc/mounts \
  || gagal "$WORK bukan tmpfs; backup dibatalkan supaya plaintext tidak ke disk"

hc /start

# --- 2. Versi (selisih minor pg_dump vs server tetap terlihat di log) ------
STEP="koneksi database"
server=$(psql -X -A -t -q -c 'SHOW server_version')
log "pg_dump: $(pg_dump --version) | server: PostgreSQL $server"

# --- 3. Dump ---------------------------------------------------------------
NAME="waregos-$(date -u +%Y%m%d-%H%M%SZ).dump.age"

STEP="pg_dump"
pg_dump --format=custom --no-owner --no-acl --schema=public --file="$WORK/db.dump"

# --- 4. Verifikasi plaintext (sama dengan db-backup.yml) -------------------
STEP="verifikasi dump"
pg_restore --list "$WORK/db.dump" > "$WORK/toc.txt"
baris=$(wc -l < "$WORK/toc.txt")
[ "$baris" -gt 40 ] || gagal "daftar isi dump hanya $baris baris (harus > 40)"
for t in users _prisma_migrations; do
  grep -Eq "TABLE DATA public $t( |\$)" "$WORK/toc.txt" || gagal "data tabel $t tidak ada di dump"
done

# --- 5. Enkripsi -----------------------------------------------------------
STEP="enkripsi age"
age -r "$AGE_RECIPIENT" -o "$WORK/$NAME" "$WORK/db.dump"
rm -f "$WORK/db.dump" "$WORK/toc.txt"
ukuran=$(wc -c < "$WORK/$NAME" | tr -d ' ')
[ "$ukuran" -gt 0 ] || gagal "hasil enkripsi kosong"

# --- 6. Unggah dan cek ukuran di R2 ----------------------------------------
STEP="unggah ke R2"
rclone copyto --retries 3 -q "$WORK/$NAME" "r2:$R2_BUCKET/$NAME"

STEP="cek ukuran di R2"
di_r2=$(rclone lsf --format s -q "r2:$R2_BUCKET/$NAME")
[ "$di_r2" = "$ukuran" ] || gagal "ukuran di R2 ($di_r2) beda dengan lokal ($ukuran)"

rm -f "$WORK/$NAME"

# --- 7. Selesai ------------------------------------------------------------
STEP=selesai
log "OK: $NAME ($ukuran byte, $baris baris daftar isi)"
hc "" "OK $NAME $ukuran byte"
