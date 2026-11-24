import { strict as assert } from 'node:assert'
import { apiOriginFrom, apiUrlFrom } from './config'

// Origin server API (tempat /health) diturunkan dari NEXT_PUBLIC_API_URL.
// Dulu memakai .replace('/api', ''), yang merusak host `api.` saat cutover:
// https://api.waregos.com/api -> https:/.waregos.com/api

assert.equal(apiOriginFrom('https://api.waregos.com/api'), 'https://api.waregos.com')
assert.equal(apiOriginFrom('http://localhost:3001/api'), 'http://localhost:3001')

// Garis miring di akhir tidak boleh mengubah hasil.
assert.equal(apiOriginFrom('https://api.waregos.com/api/'), 'https://api.waregos.com')
assert.equal(apiUrlFrom('https://api.waregos.com/api/'), 'https://api.waregos.com/api')

// Env kosong atau tidak diisi memakai default dev.
assert.equal(apiUrlFrom(undefined), 'http://localhost:3001/api')
assert.equal(apiUrlFrom(''), 'http://localhost:3001/api')
assert.equal(apiOriginFrom(apiUrlFrom(undefined)), 'http://localhost:3001')

console.log('config: semua tes lulus')
