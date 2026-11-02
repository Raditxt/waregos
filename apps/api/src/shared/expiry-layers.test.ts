import { strict as assert } from 'node:assert'
import { allocateLayers, layerStatus, summarizeLayers } from './expiry-layers'

{
  const r = allocateLayers(10, [
    { quantity: 4, expiryDate: '2027-05-31' },
    { quantity: 10, expiryDate: '2027-01-31' },
  ])
  assert.deepEqual(r.layers, [
    { expiryDate: '2027-01-31', quantity: 6 },
    { expiryDate: '2027-05-31', quantity: 4 },
  ])
  assert.equal(r.untracked, 0)
}

{
  const r = allocateLayers(3, [{ quantity: 4, expiryDate: '2027-05-31' }])
  assert.deepEqual(r.layers, [{ expiryDate: '2027-05-31', quantity: 3 }])
  assert.equal(r.untracked, 0)
}

{
  const r = allocateLayers(12, [
    { quantity: 5, expiryDate: null },
    { quantity: 4, expiryDate: '2027-02-28' },
  ])
  assert.deepEqual(r.layers, [
    { expiryDate: '2027-02-28', quantity: 4 },
    { expiryDate: null, quantity: 5 },
  ])
  assert.equal(r.untracked, 3)
}

{
  const r = allocateLayers(5, [
    { quantity: 2, expiryDate: '2027-05-31' },
    { quantity: 3, expiryDate: '2027-05-31' },
  ])
  assert.deepEqual(r.layers, [{ expiryDate: '2027-05-31', quantity: 5 }])
}

{
  assert.deepEqual(allocateLayers(0, [{ quantity: 4, expiryDate: '2027-05-31' }]), { layers: [], untracked: 0 })
  assert.deepEqual(allocateLayers(5, []), { layers: [], untracked: 5 })
}

{
  const today = '2026-11-02'
  assert.deepEqual(layerStatus('2026-11-01', today, 7), { status: 'expired', daysLeft: -1 })
  assert.deepEqual(layerStatus('2026-11-02', today, 7), { status: 'expiring_soon', daysLeft: 0 })
  assert.deepEqual(layerStatus('2026-11-09', today, 7), { status: 'expiring_soon', daysLeft: 7 })
  assert.deepEqual(layerStatus('2026-11-10', today, 7), { status: 'ok', daysLeft: 8 })
  assert.equal(layerStatus('2028-03-01', '2028-02-28', 7).daysLeft, 2)
}

{
  const s = summarizeLayers(
    [
      { expiryDate: '2026-10-31', quantity: 4 },
      { expiryDate: '2026-11-05', quantity: 6 },
      { expiryDate: '2027-05-31', quantity: 10 },
      { expiryDate: null, quantity: 2 },
    ],
    '2026-11-02',
    7
  )
  assert.equal(s.status, 'expired')
  assert.equal(s.nearestDate, '2026-10-31')
  assert.equal(s.expiredQuantity, 4)
  assert.equal(s.expiringSoonQuantity, 6)
  assert.equal(s.layers[3].status, null)
}

console.log('expiry-layers: semua tes lulus')