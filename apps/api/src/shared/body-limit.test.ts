import { strict as assert } from 'node:assert'
import Fastify from 'fastify'
import { BODY_LIMIT_BYTES } from './body-limit'
import { globalErrorHandler } from './error-handler'
import { createPurchaseSchema } from '../modules/stock/purchases.schema'
import { ok, validationError } from './response'

// App dengan dua bagian yang dipakai index.ts untuk badan request: bodyLimit dan error handler.
function buildApp() {
  const app = Fastify({ bodyLimit: BODY_LIMIT_BYTES })
  app.setErrorHandler(globalErrorHandler)
  app.post('/purchases', async (request, reply) => {
    const result = createPurchaseSchema.safeParse(request.body)
    if (!result.success) return reply.code(400).send(validationError(result.error.errors[0].message))
    return ok({ lines: result.data.items.length })
  })
  return app
}

// Badan JSON valid dengan ukuran persis `bytes` (diisi lewat kolom notes).
function jsonOfSize(bytes: number) {
  const empty = JSON.stringify({ notes: '' })
  return JSON.stringify({ notes: 'x'.repeat(bytes - Buffer.byteLength(empty)) })
}

async function post(payload: string) {
  const app = buildApp()
  // globalErrorHandler mencatat error ke konsol; diamkan supaya keluaran tes bersih
  const log = console.log
  console.log = () => {}
  try {
    return await app.inject({
      method: 'POST',
      url: '/purchases',
      headers: { 'content-type': 'application/json' },
      payload,
    })
  } finally {
    console.log = log
    await app.close()
  }
}

async function main() {
  // Satu byte di atas 64 KiB: ditolak dengan 413 dalam envelope standar, pesan Indonesia.
  {
    const res = await post(jsonOfSize(65_537))
    assert.equal(res.statusCode, 413)
    assert.deepEqual(res.json(), {
      success: false,
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Data yang dikirim terlalu besar. Kurangi isinya atau pecah menjadi beberapa bagian.',
    })
  }

  // Tepat 64 KiB masih diterima oleh batas ukuran (ditolak skema, bukan 413).
  {
    const res = await post(jsonOfSize(65_536))
    assert.equal(res.statusCode, 400)
    assert.equal(res.json().error, 'VALIDATION_ERROR')
  }

  // Nota pembelian terbesar yang sah: 200 baris dengan nilai sepanjang mungkin,
  // catatan 500 karakter, supplier dan nomor nota penuh. Harus tetap lolos.
  {
    const payload = JSON.stringify({
      kind: 'PURCHASE',
      supplierId: '3f2b8c1e-6d4a-4b7f-9e21-5a8c0d7e4f10',
      supplierName: 'S'.repeat(100),
      supplierRef: 'N'.repeat(50),
      purchasedAt: '2026-11-17T08:30:00.000+08:00',
      notes: 'c'.repeat(500),
      items: Array.from({ length: 200 }, () => ({
        productId: '3f2b8c1e-6d4a-4b7f-9e21-5a8c0d7e4f10',
        quantity: 1_000_000,
        buyPrice: 999_999_999.99,
        expiryDate: '2027-06-30',
      })),
    })
    const res = await post(payload)
    assert.equal(res.statusCode, 200, res.body)
    assert.deepEqual(res.json(), { success: true, data: { lines: 200 } })
    // Ruang longgar: nota terbesar tidak sampai setengah batas
    assert.ok(Buffer.byteLength(payload) < 32_768, `ukuran nota: ${Buffer.byteLength(payload)}`)
  }
}

main().then(() => console.log('body-limit: semua tes lulus'))
