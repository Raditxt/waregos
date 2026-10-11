import { PrismaClient, Prisma } from '@prisma/client'
import {
  customerKey,
  normalizeCustomerName,
  signedAmount,
  lockCustomer,
  getCustomerBalance,
} from '../../shared/debt-ledger'

export class DebtService {
  constructor(private prisma: PrismaClient) {}

  // Semua hutang, dikelompokkan per pelanggan (huruf besar/kecil dan spasi ekstra diabaikan)
  async getSummary() {
    const debts = await this.prisma.debtTransaction.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const grouped = new Map<string, {
      customerName: string
      totalDebt: number
      lastActivity: string
      transactionCount: number
    }>()

    for (const d of debts) {
      const key = customerKey(d.customerName)
      let g = grouped.get(key)
      if (!g) {
        // Data terurut terbaru dulu, jadi ejaan pertama yang terlihat adalah ejaan terbaru
        g = {
          customerName: normalizeCustomerName(d.customerName),
          totalDebt: 0,
          lastActivity: d.createdAt.toISOString(),
          transactionCount: 0,
        }
        grouped.set(key, g)
      }
      g.totalDebt += signedAmount(d.type, d.amount)
      g.transactionCount += 1
    }

    return [...grouped.values()]
      .filter((g) => g.totalDebt > 0)
      .sort((a, b) => b.totalDebt - a.totalDebt)
  }

  // Riwayat hutang per pelanggan
  async getHistory(customerName: string) {
    const where: Prisma.DebtTransactionWhereInput = {
      customerName: { equals: normalizeCustomerName(customerName), mode: 'insensitive' },
    }

    const history = await this.prisma.debtTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        transaction: { select: { invoiceNumber: true } },
      },
    })

    let balance = 0
    const withBalance = [...history].reverse().map((h) => {
      balance += signedAmount(h.type, h.amount)
      return {
        id: h.id,
        type: h.type,
        amount: Number(h.amount),
        balance,
        items: h.items,
        notes: h.notes,
        invoiceNumber: h.transaction?.invoiceNumber ?? null,
        createdBy: h.user.name,
        createdAt: h.createdAt.toISOString(),
      }
    }).reverse()

    const totalDebt = withBalance[0]?.balance ?? 0

    return { customerName, totalDebt, history: withBalance }
  }

  // Catat hutang baru (manual, tanpa transaksi penjualan)
  async addDebt(input: {
    customerName: string
    transactionId?: string
    amount: number
    items?: object
    notes?: string
    createdBy: string
  }) {
    await this.prisma.debtTransaction.create({
      data: {
        customerName: normalizeCustomerName(input.customerName),
        transactionId: input.transactionId,
        type: 'DEBT',
        amount: input.amount,
        items: input.items as Prisma.InputJsonValue,
        notes: input.notes,
        createdBy: input.createdBy,
      },
    })
  }

  // Catat pembayaran hutang. Cek saldo dan simpan terjadi dalam satu transaksi
  // yang diserialkan per pelanggan, jadi tidak bisa bayar melebihi hutang.
  async addPayment(input: {
    customerName: string
    amount: number
    notes?: string
    createdBy: string
  }) {
    const customerName = normalizeCustomerName(input.customerName)

    await this.prisma.$transaction(async (tx) => {
      await lockCustomer(tx, customerName)
      const balance = await getCustomerBalance(tx, customerName)

      if (input.amount > balance) {
        throw new Error(
          `Jumlah bayar (Rp ${input.amount.toLocaleString('id-ID')}) melebihi total hutang (Rp ${balance.toLocaleString('id-ID')})`
        )
      }

      await tx.debtTransaction.create({
        data: {
          customerName,
          type: 'PAYMENT',
          amount: input.amount,
          notes: input.notes ?? 'Bayar hutang',
          createdBy: input.createdBy,
        },
      })
    })
  }

  // Search nama pelanggan yang pernah hutang (tanpa duplikat beda huruf besar/kecil)
  async searchCustomers(query: string) {
    const rows = await this.prisma.debtTransaction.findMany({
      where: { customerName: { contains: normalizeCustomerName(query), mode: 'insensitive' } },
      select: { customerName: true },
      distinct: ['customerName'],
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    const seen = new Set<string>()
    const names: string[] = []
    for (const r of rows) {
      const key = customerKey(r.customerName)
      if (seen.has(key)) continue
      seen.add(key)
      names.push(normalizeCustomerName(r.customerName))
      if (names.length === 10) break
    }
    return names
  }
}