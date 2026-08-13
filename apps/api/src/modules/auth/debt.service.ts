import { PrismaClient } from '@prisma/client'

export class DebtService {
  constructor(private prisma: PrismaClient) {}

  // Semua hutang — digroup by nama pelanggan
  async getSummary() {
    const debts = await this.prisma.debtTransaction.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Group by customerName
    const grouped: Record<string, {
      customerName: string
      totalDebt: number
      lastActivity: string
      transactionCount: number
    }> = {}

    for (const d of debts) {
      if (!grouped[d.customerName]) {
        grouped[d.customerName] = {
          customerName: d.customerName,
          totalDebt: 0,
          lastActivity: d.createdAt.toISOString(),
          transactionCount: 0,
        }
      }
      if (d.type === 'DEBT') {
        grouped[d.customerName].totalDebt += Number(d.amount)
      } else {
        grouped[d.customerName].totalDebt -= Number(d.amount)
      }
      grouped[d.customerName].transactionCount += 1
    }

    return Object.values(grouped)
      .filter(g => g.totalDebt > 0)
      .sort((a, b) => b.totalDebt - a.totalDebt)
  }

  // Riwayat hutang per pelanggan
  async getHistory(customerName: string) {
    const history = await this.prisma.debtTransaction.findMany({
      where: {
        customerName: {
          equals: customerName,
          mode: 'insensitive'
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        transaction: { select: { invoiceNumber: true } }
      }
    })

    // Hitung running balance
    let balance = 0
    const withBalance = [...history].reverse().map(h => {
      if (h.type === 'DEBT') balance += Number(h.amount)
      else balance -= Number(h.amount)
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

  // Catat hutang baru
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
        customerName: input.customerName,
        transactionId: input.transactionId,
        type: 'DEBT',
        amount: input.amount,
        items: input.items as any,
        notes: input.notes,
        createdBy: input.createdBy,
      }
    })
  }

  // Catat pembayaran hutang
  async addPayment(input: {
    customerName: string
    amount: number
    notes?: string
    createdBy: string
  }) {
    // Cek total hutang dulu
    const history = await this.getHistory(input.customerName)
    if (input.amount > history.totalDebt) {
      throw new Error(
        `Jumlah bayar (Rp ${input.amount.toLocaleString('id-ID')}) melebihi total hutang (Rp ${history.totalDebt.toLocaleString('id-ID')})`
      )
    }

    await this.prisma.debtTransaction.create({
      data: {
        customerName: input.customerName,
        type: 'PAYMENT',
        amount: input.amount,
        notes: input.notes ?? 'Bayar hutang',
        createdBy: input.createdBy,
      }
    })
  }

  // Search nama pelanggan yang pernah hutang
  async searchCustomers(query: string) {
    const results = await this.prisma.debtTransaction.findMany({
      where: {
        customerName: { contains: query, mode: 'insensitive' }
      },
      select: { customerName: true },
      distinct: ['customerName'],
      take: 10,
    })
    return results.map(r => r.customerName)
  }
}