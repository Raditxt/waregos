import { strict as assert } from 'node:assert'
import Fastify from 'fastify'
import { trustProxyFromEnv, type TrustProxyEnv } from './trust-proxy'

// IP klien yang dilihat API (request.ip) kalau dijalankan dengan env tertentu.
async function ipSeenBy(env: TrustProxyEnv, remoteAddress: string, forwardedFor: string) {
  const app = Fastify({ trustProxy: trustProxyFromEnv(env) })
  app.get('/ip', async (request) => ({ ip: request.ip }))
  const res = await app.inject({
    method: 'GET',
    url: '/ip',
    remoteAddress,
    headers: { 'x-forwarded-for': forwardedFor },
  })
  await app.close()
  return res.json().ip as string
}

const PROD = { NODE_ENV: 'production', TRUST_PROXY_CIDRS: '10.89.10.0/24' }
// <palsu dari klien>, <asli yang ditambahkan Cloudflare>
const XFF = '203.0.113.9, 198.51.100.7'

async function main() {
  // Request dari cloudflared (di dalam subnet internal): IP klien = entri paling kanan
  // yang tidak dipercaya, bukan entri palsu kiriman klien.
  assert.equal(await ipSeenBy(PROD, '10.89.10.5', XFF), '198.51.100.7')

  // Request dari luar subnet (bukan proxy tepercaya): header diabaikan, IP = alamat soket.
  assert.equal(await ipSeenBy(PROD, '10.89.11.5', XFF), '10.89.11.5')
  assert.equal(await ipSeenBy(PROD, '203.0.113.50', XFF), '203.0.113.50')

  // Produksi tanpa TRUST_PROXY_CIDRS ditolak: semua request akan terlihat datang dari
  // IP cloudflared dan rate limit kena ke semua orang sekaligus.
  for (const kosong of [undefined, '', '  ', ' , ']) {
    assert.throws(
      () => trustProxyFromEnv({ NODE_ENV: 'production', TRUST_PROXY_CIDRS: kosong }),
      /TRUST_PROXY_CIDRS wajib diisi di produksi/,
    )
  }

  // Di luar produksi, kosong = trustProxy mati: X-Forwarded-For tidak pernah dipercaya.
  for (const NODE_ENV of ['development', 'test', undefined]) {
    assert.equal(trustProxyFromEnv({ NODE_ENV }), false)
    assert.equal(trustProxyFromEnv({ NODE_ENV, TRUST_PROXY_CIDRS: '' }), false)
  }
  assert.equal(await ipSeenBy({ NODE_ENV: 'development' }, '10.89.10.5', XFF), '10.89.10.5')

  // Beberapa CIDR dipisah koma, spasi di sekitarnya diabaikan.
  const DUA = { NODE_ENV: 'production', TRUST_PROXY_CIDRS: ' 10.89.10.0/24 , 192.168.50.0/24 ' }
  assert.equal(await ipSeenBy(DUA, '192.168.50.2', XFF), '198.51.100.7')
  assert.equal(await ipSeenBy(DUA, '10.89.10.5', XFF), '198.51.100.7')
}

main().then(() => console.log('trust-proxy: semua tes lulus'))
