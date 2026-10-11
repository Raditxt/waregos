import { Prisma } from '@prisma/client'

// Efek tiap jenis catatan pada saldo hutang pelanggan:
//   DEBT    (+) hutang bertambah
//   PAYMENT (-) pelanggan membayar
//   CANCEL  (-) transaksi hutang dibatalkan (entri pembalik; data lama tidak dihapus)
const SIGN: Record<string, 1 | -1> = { DEBT: 1, PAYMENT: -1, CANCEL: -1 }

export function signedAmount(type: string, amount: Prisma.Decimal | number): number {
  return (SIGN[type] ?? -1) * Number(amount)
}

export const normalizeCustomerName = (name: string) => name.trim().replace(/\s+/g, ' ')
export const customerKey = (name: string) => normalizeCustomerName(name).toLowerCase()

// Satu pelanggan diproses satu per satu: mencegah dua pembayaran atau pembatalan
// yang membaca saldo yang sama lalu sama-sama lolos. Kunci lepas otomatis saat transaksi selesai.
export async function lockCustomer(tx: Prisma.TransactionClient, name: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${customerKey(name)}))`
}

export async function getCustomerBalance(tx: Prisma.TransactionClient, name: string): Promise<number> {
  const rows = await tx.debtTransaction.findMany({
    where: { customerName: { equals: normalizeCustomerName(name), mode: 'insensitive' } },
    select: { type: true, amount: true },
  })
  return rows.reduce((sum, r) => sum + signedAmount(r.type, r.amount), 0)
}