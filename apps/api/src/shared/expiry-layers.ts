export type ExpiryStatus = 'ok' | 'expiring_soon' | 'expired'

export interface PurchaseLine { quantity: number; expiryDate: string | null }
export interface ExpiryLayer { expiryDate: string | null; quantity: number }
export interface Allocation { layers: ExpiryLayer[]; untracked: number }
export interface LayerView extends ExpiryLayer {
  status: ExpiryStatus | null
  daysLeft: number | null
}
export interface ExpirySummary {
  layers: LayerView[]
  nearestDate: string | null
  status: ExpiryStatus | null
  expiredQuantity: number
  expiringSoonQuantity: number
}

export function allocateLayers(stock: number, linesNewestFirst: PurchaseLine[]): Allocation {
  let remaining = Math.max(0, stock)
  const merged = new Map<string, ExpiryLayer>()

  for (const line of linesNewestFirst) {
    if (remaining <= 0) break
    const take = Math.min(remaining, line.quantity)
    if (take <= 0) continue
    remaining -= take

    const key = line.expiryDate ?? ''
    const existing = merged.get(key)
    if (existing) existing.quantity += take
    else merged.set(key, { expiryDate: line.expiryDate, quantity: take })
  }

  const layers = [...merged.values()].sort((a, b) => {
    if (a.expiryDate === b.expiryDate) return 0
    if (a.expiryDate === null) return 1
    if (b.expiryDate === null) return -1
    return a.expiryDate.localeCompare(b.expiryDate)
  })

  return { layers, untracked: remaining }
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function layerStatus(expiryDate: string, today: string, alertDays: number) {
  const daysLeft = dayNumber(expiryDate) - dayNumber(today)
  const status: ExpiryStatus =
    daysLeft < 0 ? 'expired' : daysLeft <= alertDays ? 'expiring_soon' : 'ok'
  return { status, daysLeft }
}

const RANK: Record<ExpiryStatus, number> = { ok: 0, expiring_soon: 1, expired: 2 }

export function summarizeLayers(
  layers: ExpiryLayer[],
  today: string,
  alertDays: number
): ExpirySummary {
  const views: LayerView[] = []
  let nearestDate: string | null = null
  let worst: ExpiryStatus | null = null
  let expiredQuantity = 0
  let expiringSoonQuantity = 0

  for (const layer of layers) {
    if (layer.expiryDate === null) {
      views.push({ ...layer, status: null, daysLeft: null })
      continue
    }
    const { status, daysLeft } = layerStatus(layer.expiryDate, today, alertDays)
    if (nearestDate === null) nearestDate = layer.expiryDate // layers sudah urut menaik
    if (status === 'expired') expiredQuantity += layer.quantity
    if (status === 'expiring_soon') expiringSoonQuantity += layer.quantity
    if (worst === null || RANK[status] > RANK[worst]) worst = status
    views.push({ ...layer, status, daysLeft })
  }

  return { layers: views, nearestDate, status: worst, expiredQuantity, expiringSoonQuantity }
}