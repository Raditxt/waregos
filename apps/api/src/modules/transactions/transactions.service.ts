import { PrismaClient, Prisma, StockMovementType } from '@prisma/client';
import { CreateTransactionInput, TransactionQueryInput } from './transactions.schema';
import { generateInvoiceNumber, startOfDay, endOfDay } from '@waregos/utils';
import { TransactionWithRelations } from '../../shared/prisma-types';
// ⚠️ Sesuaikan path import di bawah dengan lokasi asli helper-nya.
// Keduanya dipakai oleh cancel() untuk menangani pembatalan transaksi hutang.
import { lockCustomer, getCustomerBalance } from '../../shared/debt-ledger';

const trxInclude = {
  user: { select: { name: true } },
  items: { include: { product: { select: { name: true } } } },
} satisfies Prisma.TransactionInclude;

// Default Prisma hanya 5 detik. Dengan database di cloud, keranjang besar bisa melewatinya.
const TX_OPTIONS = { maxWait: 5000, timeout: 20000 };

const byProductId = (a: { productId: string }, b: { productId: string }) =>
  a.productId.localeCompare(b.productId);

export class TransactionsService {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── CREATE TRANSACTION ─────────────────────────────────────
  async create(input: CreateTransactionInput, userId: string) {
    // 0. Idempotency: kunci yang sama = kembalikan transaksi yang sudah ada
    if (input.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return { trx: existing, replayed: true };
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        // 1. Ambil produk
        const productIds = input.items.map((i) => i.productId);
        if (new Set(productIds).size !== productIds.length) {
          throw new Error('Produk yang sama tidak boleh muncul dua kali dalam satu transaksi');
        }
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, isActive: true },
        });
        if (products.length !== productIds.length) {
          throw new Error('Satu atau lebih produk tidak ditemukan');
        }
        const productMap = new Map(products.map((p) => [p.id, p] as const));

        // 2. Validasi awal (pesan ramah). Penjaga sebenarnya ada di langkah 5.
        for (const item of input.items) {
          const product = productMap.get(item.productId)!;
          if (product.stock < item.quantity) {
            throw new Error(`Stok ${product.name} tidak cukup (sisa: ${product.stock})`);
          }
          if (product.buyPrice === null) {
            throw new Error(
              `${product.name} belum punya harga beli. Lengkapi dulu di halaman Produk atau catat pembelian sebelum dijual.`
            );
          }
        }

        // 3. Hitung total & validasi pembayaran
        const totalAmount = input.items.reduce((sum, i) => sum + i.sellPrice * i.quantity, 0);
        const customerName = input.customerName?.trim();
        const isCash = input.paymentMethod === 'CASH';

        if (isCash && input.paidAmount < totalAmount) {
          throw new Error(`Uang bayar kurang. Total: ${totalAmount}, Bayar: ${input.paidAmount}`);
        }
        if (input.paymentMethod === 'DEBT' && !customerName) {
          throw new Error('Nama pelanggan wajib diisi untuk transaksi hutang');
        }

        // Tunai: sesuai input. QRIS: dibayar pas. Hutang: belum dibayar.
        const paidAmount = isCash ? input.paidAmount : input.paymentMethod === 'QRIS' ? totalAmount : 0;
        const changeAmount = isCash ? input.paidAmount - totalAmount : 0;

        // 4. Buat transaksi
        const trx = await tx.transaction.create({
          data: {
            invoiceNumber: generateInvoiceNumber('TRX'),
            idempotencyKey: input.idempotencyKey,
            userId,
            paymentMethod: input.paymentMethod,
            totalAmount,
            paidAmount,
            changeAmount,
            notes: input.notes,
            items: {
              create: input.items.map((item) => {
                const product = productMap.get(item.productId)!;
                return {
                  productId: item.productId,
                  quantity: item.quantity,
                  buyPrice: product.buyPrice!, // aman: sudah divalidasi non-null di langkah 2
                  sellPrice: item.sellPrice,
                  subtotal: item.sellPrice * item.quantity,
                };
              }),
            },
          },
          include: trxInclude,
        });

        // 5. Kurangi stok secara atomik, urut productId
        const ordered = [...input.items].sort(byProductId);
        const soldAt = new Date();
        for (const item of ordered) {
          const res = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity }, lastSoldAt: soldAt },
          });
          if (res.count !== 1) {
            const name = productMap.get(item.productId)!.name;
            throw new Error(
              `Stok ${name} tidak cukup. Mungkin baru saja terjual di perangkat lain, coba muat ulang.`
            );
          }
        }

        // Baca stok akhir sekali (baris sudah terkunci oleh transaksi ini)
        const after = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, stock: true },
        });
        const stockAfterMap = new Map(after.map((p) => [p.id, p.stock] as const));

        await tx.stockMovement.createMany({
          data: ordered.map((item) => {
            const stockAfter = stockAfterMap.get(item.productId)!;
            return {
              productId: item.productId,
              type: StockMovementType.SALE_OUT,
              quantity: item.quantity,
              stockBefore: stockAfter + item.quantity,
              stockAfter,
              transactionId: trx.id,
              userId,
            };
          }),
        });

        // 6. Catat hutang
        if (input.paymentMethod === 'DEBT' && customerName) {
          await tx.debtTransaction.create({
            data: {
              customerName,
              transactionId: trx.id,
              type: 'DEBT',
              amount: totalAmount,
              items: trx.items.map((item) => ({
                name: item.product?.name ?? item.productId,
                quantity: item.quantity,
                price: Number(item.sellPrice),
              })) as Prisma.InputJsonValue,
              notes: input.notes ?? 'Hutang via POS',
              createdBy: userId,
            },
          });
        }

        return trx;
      }, TX_OPTIONS);

      return { trx: this.formatTransaction(created), replayed: false };
    } catch (err) {
      // Dua request berkunci sama datang bersamaan: yang kalah kena unique violation
      if (
        input.idempotencyKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.findByIdempotencyKey(input.idempotencyKey);
        if (existing) return { trx: existing, replayed: true };
      }
      throw err;
    }
  }

  private async findByIdempotencyKey(key: string) {
    const trx = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: key },
      include: trxInclude,
    });
    return trx ? this.formatTransaction(trx) : null;
  }

  // ─── FIND ALL TRANSACTIONS ─────────────────────────────────
  async findAll(query: TransactionQueryInput) {
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')));
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = startOfDay(new Date(query.dateFrom));
      if (query.dateTo) where.createdAt.lte = endOfDay(new Date(query.dateTo));
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: trxInclude,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: data.map((trx) => this.formatTransaction(trx)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── FIND TRANSACTION BY ID ────────────────────────────────
  async findById(id: string) {
    const trx = await this.prisma.transaction.findUnique({
      where: { id },
      include: trxInclude,
    });
    if (!trx) return null;
    return this.formatTransaction(trx);
  }

  // ─── CANCEL TRANSACTION ─────────────────────────────────────
  async cancel(id: string, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      // Compare-and-set: hanya satu pembatalan yang bisa menang
      const res = await tx.transaction.updateMany({
        where: { id, status: 'COMPLETED' },
        data: { status: 'CANCELLED' },
      });
      if (res.count !== 1) {
        const exists = await tx.transaction.findUnique({ where: { id }, select: { id: true } });
        throw new Error(exists ? 'Transaksi tidak bisa dibatalkan' : 'Transaksi tidak ditemukan');
      }

      // Transaksi hutang: tambahkan entri pembalik (catatan lama tidak dihapus)
      const debt = await tx.debtTransaction.findFirst({
        where: { transactionId: id, type: 'DEBT' },
      });
      if (debt) {
        await lockCustomer(tx, debt.customerName);
        const balance = await getCustomerBalance(tx, debt.customerName);

        // Kalau pelanggan sudah membayar sebagian, membatalkan akan membuat saldo negatif
        // (toko berutang ke pelanggan). Itu butuh keputusan manusia, jadi ditolak.
        if (Math.round(balance * 100) < Math.round(Number(debt.amount) * 100)) {
          throw new Error(
            `Transaksi ini tidak bisa dibatalkan karena ${debt.customerName} sudah membayar sebagian hutangnya. Hubungi admin untuk koreksi manual.`
          );
        }

        const trx = await tx.transaction.findUnique({ where: { id }, select: { invoiceNumber: true } });
        await tx.debtTransaction.create({
          data: {
            customerName: debt.customerName,
            transactionId: id,
            type: 'CANCEL',
            amount: debt.amount,
            notes: `Pembatalan transaksi ${trx?.invoiceNumber ?? id}`,
            createdBy: userId,
          },
        });
      }

      // Kembalikan stok secara atomik
      const items = (await tx.transactionItem.findMany({ where: { transactionId: id } })).sort(byProductId);

      const movements: Prisma.StockMovementCreateManyInput[] = [];
      for (const item of items) {
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
          select: { stock: true },
        });
        movements.push({
          productId: item.productId,
          type: StockMovementType.RETURN_IN,
          quantity: item.quantity,
          stockBefore: updated.stock - item.quantity,
          stockAfter: updated.stock,
          transactionId: id,
          userId,
        });
      }
      await tx.stockMovement.createMany({ data: movements });
    }, TX_OPTIONS);
  }

  // ─── FORMAT RESPONSE ────────────────────────────────────────
  private formatTransaction(trx: TransactionWithRelations) {
    return {
      id: trx.id,
      invoiceNumber: trx.invoiceNumber,
      userId: trx.userId,
      userName: trx.user.name,
      status: trx.status,
      paymentMethod: trx.paymentMethod,
      totalAmount: Number(trx.totalAmount),
      paidAmount: Number(trx.paidAmount),
      changeAmount: Number(trx.changeAmount),
      notes: trx.notes,
      createdAt: trx.createdAt.toISOString(),
      items: trx.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        buyPrice: Number(item.buyPrice),
        sellPrice: Number(item.sellPrice),
        subtotal: Number(item.subtotal),
      })),
    };
  }
}