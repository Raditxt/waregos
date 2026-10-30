const EXPIRY_PATTERN = /^(20\d{2})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/;

export function parseExpiry(value: string): Date | null {
  const m = EXPIRY_PATTERN.exec(value);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);

  if (m[3] === undefined) {
    // Hari ke-0 bulan berikutnya = hari terakhir bulan ini
    return new Date(Date.UTC(year, month, 0));
  }

  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Tolak tanggal yang tidak ada, mis. 2027-02-30
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}