import { strict as assert } from 'node:assert'
import { loginSchema } from '../modules/auth/auth.schema'
import { createTransactionSchema } from '../modules/transactions/transactions.schema'
import { createPurchaseSchema } from '../modules/stock/purchases.schema'
import { addDebtSchema } from '../modules/debt/debt.schema'

const PRODUCT_ID = '3f2b8c1e-6d4a-4b7f-9e21-5a8c0d7e4f10'

// Pesan yang dikirim route ke klien: validationError(result.error.errors[0].message)
function firstError(schema: { safeParse: (v: unknown) => any }, input: unknown): string | null {
  const r = schema.safeParse(input)
  return r.success ? null : r.error.errors[0].message
}

// --- Login ---
{
  const login = (username: string, password: string) => firstError(loginSchema, { username, password })

  assert.equal(login('a'.repeat(50), 'rahasia123'), null)
  assert.equal(login('a'.repeat(51), 'rahasia123'), 'Username maksimal 50 karakter')

  // Password: sama dengan batas saat password dibuat (bcrypt memotong setelah 72 byte)
  assert.equal(login('kasir', 'p'.repeat(72)), null)
  assert.equal(login('kasir', 'p'.repeat(73)), 'Password maksimal 72 karakter')
}

// --- Checkout ---
{
  const checkout = (n: number) =>
    firstError(createTransactionSchema, {
      items: Array.from({ length: n }, () => ({ productId: PRODUCT_ID, quantity: 1, sellPrice: 5000 })),
      paymentMethod: 'CASH',
      paidAmount: 5000 * n,
    })

  assert.equal(checkout(200), null)
  assert.equal(checkout(201), 'Satu transaksi maksimal 200 produk')
}

// --- Pembelian dan saldo awal ---
{
  const purchase = (n: number, kind: 'PURCHASE' | 'OPENING') =>
    firstError(createPurchaseSchema, {
      kind,
      items: Array.from({ length: n }, () => ({
        productId: PRODUCT_ID,
        quantity: 12,
        buyPrice: 3500,
        expiryDate: '2027-06',
      })),
    })

  for (const kind of ['PURCHASE', 'OPENING'] as const) {
    assert.equal(purchase(200, kind), null)
    assert.equal(purchase(201, kind), 'Satu nota maksimal 200 baris')
  }
}

// --- Hutang manual (rincian barang opsional) ---
{
  const debt = (n: number) =>
    firstError(addDebtSchema, {
      customerName: 'Bu Sari',
      amount: 25000,
      items: Array.from({ length: n }, () => ({ name: 'Gula 1 kg', quantity: 1, price: 17500 })),
    })

  assert.equal(firstError(addDebtSchema, { customerName: 'Bu Sari', amount: 25000 }), null)
  assert.equal(debt(200), null)
  assert.equal(debt(201), 'Rincian hutang maksimal 200 barang')
}

console.log('input-limits: semua tes lulus')
