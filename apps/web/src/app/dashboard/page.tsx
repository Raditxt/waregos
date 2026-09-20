'use client'

import { useEffect, useState } from 'react'
import type { AxiosResponse } from 'axios'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import {
  TrendingUp, ShoppingCart, Package, DollarSign,
  Loader2, AlertTriangle, BarChart3, ArrowUpRight,
  Calendar, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { formatRupiah } from '@/lib/format'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'

interface DailySummary {
  totalTransactions: number
  totalRevenue: number
  totalProfit: number
  totalItemsSold: number
}

interface MonthlyDay {
  date: string
  totalRevenue: number
  totalTransactions: number
}

interface ExpiringProduct {
  id: string
  name: string
  stock: number
  unit: string
  expiryDate: string
  daysLeft: number
  status: string
}

interface DeadStockProduct {
  id: string
  name: string
  stock: number
  unit: string
  stockValue: number
  status: string
  daysSinceLastSold: number | null
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const today = format(new Date(), 'yyyy-MM-dd')
  const now = new Date()

  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [monthly, setMonthly] = useState<MonthlyDay[]>([])
  const [expiring, setExpiring] = useState<ExpiringProduct[]>([])
  const [deadStock, setDeadStock] = useState<DeadStockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const requests: Promise<AxiosResponse>[] = [
        api.get(`/reports/summary?date=${today}`),
        api.get('/products/expiring-soon'),
        api.get('/products/dead-stock'),
      ]
      if (isAdmin) {
        requests.push(
          api.get(`/reports/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
        )
      }

      const results = await Promise.all(requests)
      setSummary(results[0].data.data)
      setExpiring(results[1].data.data ?? [])
      setDeadStock(results[2].data.data ?? [])
      if (isAdmin && results[3]) {
        setMonthly(results[3].data.data.daily ?? [])
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const init = async () => { await fetchData() }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Memuat dashboard...
          </p>
        </div>
      </div>
    )
  }

  const summaryCards = [
    {
      label: 'Transaksi Hari Ini',
      value: `${summary?.totalTransactions ?? 0}`,
      sub: 'transaksi',
      icon: ShoppingCart,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      label: 'Omzet Hari Ini',
      value: formatRupiah(summary?.totalRevenue ?? 0),
      sub: 'pendapatan',
      icon: DollarSign,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.1)',
    },
    {
      label: 'Profit Hari Ini',
      value: formatRupiah(summary?.totalProfit ?? 0),
      sub: 'keuntungan bersih',
      icon: TrendingUp,
      color: '#f97316',
      bg: 'rgba(249,115,22,0.1)',
    },
    {
      label: 'Item Terjual',
      value: `${summary?.totalItemsSold ?? 0}`,
      sub: 'item hari ini',
      icon: Package,
      color: '#a855f7',
      bg: 'rgba(168,85,247,0.1)',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Dashboard
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Selamat datang, {user?.name} · {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
          style={{
            background: 'var(--muted)',
            color: 'var(--muted-foreground)',
            border: '1px solid var(--border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--primary-light)'
            e.currentTarget.style.color = 'var(--primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--muted)'
            e.currentTarget.style.color = 'var(--muted-foreground)'
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-2xl p-5 transition-all duration-200"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = color
              e.currentTarget.style.boxShadow = `0 4px 24px -4px ${color}25`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                {label}
              </p>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: bg }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
              {value}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Expiry Alert */}
        {expiring.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.1)' }}
                >
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Peringatan Produk
                </p>
              </div>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
              >
                {expiring.length}
              </span>
            </div>
            <div className="space-y-2">
              {expiring.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 rounded-xl px-3 transition-colors"
                  style={{ background: 'var(--muted)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {p.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      Stok: {p.stock} {p.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: p.status === 'expired'
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(245,158,11,0.15)',
                        color: p.status === 'expired' ? '#ef4444' : '#f59e0b',
                      }}
                    >
                      {p.status === 'expired' ? 'Kadaluarsa' : `${p.daysLeft} hari lagi`}
                    </span>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      {format(new Date(p.expiryDate), 'd MMM yyyy', { locale: id })}
                    </p>
                  </div>
                </div>
              ))}
              {expiring.length > 4 && (
                <p className="text-xs text-center pt-1" style={{ color: 'var(--muted-foreground)' }}>
                  +{expiring.length - 4} produk lainnya
                </p>
              )}
            </div>
          </div>
        )}

        {/* Dead Stock */}
        {deadStock.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(245,158,11,0.1)' }}
                >
                  <Package className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Dead Stock
                </p>
              </div>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}
              >
                Modal Rp {deadStock.reduce((s, p) => s + p.stockValue, 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="space-y-2">
              {deadStock.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 rounded-xl px-3"
                  style={{ background: 'var(--muted)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {p.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {p.stock} {p.unit}
                    </p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: p.status === 'never_sold'
                        ? 'rgba(245,158,11,0.15)'
                        : 'rgba(239,68,68,0.15)',
                      color: p.status === 'never_sold' ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    {p.status === 'never_sold'
                      ? 'Belum pernah terjual'
                      : `${p.daysSinceLastSold} hari`}
                  </span>
                </div>
              ))}
              {deadStock.length > 4 && (
                <p className="text-xs text-center pt-1" style={{ color: 'var(--muted-foreground)' }}>
                  +{deadStock.length - 4} produk lainnya
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart — Admin only */}
      {isAdmin && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(249,115,22,0.1)' }}
              >
                <BarChart3 className="w-3.5 h-3.5" style={{ color: '#f97316' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Omzet Bulan Ini
              </p>
            </div>
            {monthly.length > 0 && (
              <div className="flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                <span className="text-xs font-medium" style={{ color: '#22c55e' }}>
                  {formatRupiah(monthly.reduce((s, d) => s + d.totalRevenue, 0))} total
                </span>
              </div>
            )}
          </div>

          {monthly.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 rounded-xl"
              style={{ background: 'var(--muted)' }}
            >
              <BarChart3 className="w-8 h-8 mb-2" style={{ color: 'var(--muted-foreground)' }} />
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Belum ada data transaksi bulan ini
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => format(new Date(v), 'd', { locale: id })}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value) => [formatRupiah(Number(value)), 'Omzet']}
                  labelFormatter={(label) =>
                    format(new Date(label), 'd MMMM yyyy', { locale: id })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="totalRevenue"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#orangeGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#f97316', stroke: 'var(--card)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}