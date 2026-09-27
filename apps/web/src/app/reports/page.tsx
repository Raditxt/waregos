'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatRupiah } from '@/lib/format'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  TrendingUp, ShoppingCart, Package, DollarSign,
  Loader2, Calendar, BarChart3, ArrowUpRight,
  ArrowDownRight, Minus
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar
} from 'recharts'

interface DailySummary {
  date: string
  totalTransactions: number
  cancelledTransactions: number
  totalRevenue: number
  totalProfit: number
  totalItemsSold: number
}

interface MonthlyDay {
  date: string
  totalRevenue: number
  totalProfit: number
  totalTransactions: number
  totalItemsSold: number
}

interface MonthlyReport {
  year: number
  month: number
  totalTransactions: number
  totalRevenue: number
  totalProfit: number
  daily: MonthlyDay[]
}

interface TopProduct {
  productId: string
  productName: string
  unit: string
  totalQuantity: number
  totalRevenue: number
  totalProfit: number
}

interface StockMovement {
  id: string
  productName: string
  type: string
  quantity: number
  stockBefore: number
  stockAfter: number
  userName: string
  notes: string | null
  createdAt: string
}

type TabType = 'daily' | 'monthly' | 'products' | 'stock'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('daily')

  // Nilai stabil (dihitung sekali saat mount)
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [monthValue, setMonthValue] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })

  // Daily
  const [dailyDate, setDailyDate] = useState(today)
  const [daily, setDaily] = useState<DailySummary | null>(null)
  const [loadingDaily, setLoadingDaily] = useState(false)

  // Monthly
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null)
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  // Top products
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productDateFrom, setProductDateFrom] = useState('')
  const [productDateTo, setProductDateTo] = useState(today)

  // Stock movements
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loadingStock, setLoadingStock] = useState(false)

  const fetchDaily = useCallback(async (date: string) => {
    setLoadingDaily(true)
    try {
      const res = await api.get('/reports/summary', { params: { date } })
      setDaily(res.data.data)
    } catch {
      toast.error('Gagal memuat laporan harian')
    } finally {
      setLoadingDaily(false)
    }
  }, [setDaily, setLoadingDaily])

  const fetchMonthly = useCallback(async (month: string) => {
    setLoadingMonthly(true)
    try {
      const [year, m] = month.split('-')
      const res = await api.get('/reports/monthly', { params: { year, month: m } })
      setMonthly(res.data.data)
    } catch {
      toast.error('Gagal memuat laporan bulanan')
    } finally {
      setLoadingMonthly(false)
    }
  }, [setMonthly, setLoadingMonthly])

  const fetchTopProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const params: Record<string, string> = { limit: '10' }
      if (productDateFrom) params.dateFrom = productDateFrom
      if (productDateTo) params.dateTo = productDateTo
      const res = await api.get('/reports/top-products', { params })
      setTopProducts(res.data.data ?? [])
    } catch {
      toast.error('Gagal memuat laporan produk')
    } finally {
      setLoadingProducts(false)
    }
  }, [productDateFrom, productDateTo, setTopProducts, setLoadingProducts])

  const fetchStock = useCallback(async () => {
    setLoadingStock(true)
    try {
      const res = await api.get('/reports/stock-movements', { params: { limit: 50 } })
      setMovements(res.data.data ?? [])
    } catch {
      toast.error('Gagal memuat pergerakan stok')
    } finally {
      setLoadingStock(false)
    }
  }, [setMovements, setLoadingStock])

  // Initial load
  useEffect(() => {
    const init = async () => { await fetchDaily(today) }
    init()
  }, [fetchDaily, today])

  useEffect(() => {
    if (activeTab !== 'monthly') return
    const load = async () => { await fetchMonthly(monthValue) }
    load()
  }, [activeTab, monthValue, fetchMonthly])

  useEffect(() => {
    if (activeTab !== 'products') return
    const load = async () => { await fetchTopProducts() }
    load()
  }, [activeTab, fetchTopProducts])

  useEffect(() => {
    if (activeTab !== 'stock') return
    const load = async () => { await fetchStock() }
    load()
  }, [activeTab, fetchStock])

  const tabs: { key: TabType; label: string }[] = [
    { key: 'daily', label: 'Harian' },
    { key: 'monthly', label: 'Bulanan' },
    { key: 'products', label: 'Produk' },
    { key: 'stock', label: 'Stok' },
  ]

  const movementColor = (type: string) => {
    switch (type) {
      case 'SALE': return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Penjualan' }
      case 'PURCHASE': return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'Pembelian' }
      case 'ADJUSTMENT': return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Penyesuaian' }
      default: return { color: 'var(--muted-foreground)', bg: 'var(--muted)', label: type }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Laporan
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          Analitik dan pergerakan data toko
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'var(--muted)' }}
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === key ? 'var(--card)' : 'transparent',
              color: activeTab === key ? 'var(--primary)' : 'var(--muted-foreground)',
              boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* DAILY TAB */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Date picker */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <Calendar className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="date"
              value={dailyDate}
              max={today}
              onChange={(e) => {
                setDailyDate(e.target.value)
                fetchDaily(e.target.value)
              }}
              className="bg-transparent text-sm outline-none"
              style={{ color: 'var(--foreground)' }}
            />
          </div>

          {loadingDaily ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
          ) : daily ? (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: 'Total Transaksi', value: `${daily.totalTransactions}`, sub: `${daily.cancelledTransactions} dibatalkan`, icon: ShoppingCart, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                { label: 'Omzet', value: formatRupiah(daily.totalRevenue), sub: 'pendapatan kotor', icon: DollarSign, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
                { label: 'Profit', value: formatRupiah(daily.totalProfit), sub: 'keuntungan bersih', icon: TrendingUp, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
                { label: 'Item Terjual', value: `${daily.totalItemsSold}`, sub: 'dari semua transaksi', icon: Package, color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
              ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                  </div>
                  <p className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{sub}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* MONTHLY TAB */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          {/* Month picker */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <Calendar className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="month"
              value={monthValue}
              max={format(new Date(), 'yyyy-MM')}
              onChange={(e) => setMonthValue(e.target.value)}
              className="bg-transparent text-sm outline-none"
              style={{ color: 'var(--foreground)' }}
            />
          </div>

          {loadingMonthly ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
          ) : monthly ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Transaksi', value: `${monthly.totalTransactions}`, icon: ShoppingCart, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                  { label: 'Omzet', value: formatRupiah(monthly.totalRevenue), icon: DollarSign, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
                  { label: 'Profit', value: formatRupiah(monthly.totalProfit), icon: TrendingUp, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                    </div>
                    <p className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              {monthly.daily.length > 0 ? (
                <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Omzet Harian</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                      <span className="text-xs font-medium" style={{ color: '#22c55e' }}>
                        {formatRupiah(monthly.totalRevenue)} total
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={monthly.daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => format(new Date(v), 'd')}
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        axisLine={false} tickLine={false} width={36}
                      />
                      <Tooltip
                        contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px', color: 'var(--foreground)' }}
                        formatter={(value) => [formatRupiah(Number(value)), 'Omzet']}
                        labelFormatter={(label) => format(new Date(label), 'd MMMM yyyy', { locale: id })}
                      />
                      <Area type="monotone" dataKey="totalRevenue" stroke="#f97316" strokeWidth={2} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: '#f97316', stroke: 'var(--card)', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--muted-foreground)' }} />
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Belum ada data transaksi bulan ini</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Date filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <Calendar className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
              <input
                type="date"
                value={productDateFrom}
                max={today}
                onChange={(e) => setProductDateFrom(e.target.value)}
                className="bg-transparent text-sm outline-none"
                style={{ color: 'var(--foreground)' }}
                placeholder="Dari tanggal"
              />
            </div>
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>s/d</span>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <Calendar className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
              <input
                type="date"
                value={productDateTo}
                max={today}
                onChange={(e) => setProductDateTo(e.target.value)}
                className="bg-transparent text-sm outline-none"
                style={{ color: 'var(--foreground)' }}
              />
            </div>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
          ) : topProducts.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <Package className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--muted-foreground)' }} />
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Belum ada data produk terjual</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Bar chart */}
              <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Top {topProducts.length} Produk Terlaris
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="productName"
                      width={90}
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                    />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px' }}
                      formatter={(value) => [`${value} item`, 'Terjual']}
                    />
                    <Bar dataKey="totalQuantity" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['#', 'Produk', 'Terjual', 'Omzet', 'Profit'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p, i) => (
                        <tr key={p.productId} style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: 'var(--muted-foreground)' }}>
                            {i + 1}
                          </td>
                          <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>
                            {p.productName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                              {p.totalQuantity} {p.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>
                            {formatRupiah(p.totalRevenue)}
                          </td>
                          <td className="px-4 py-3 font-bold" style={{ color: '#22c55e' }}>
                            {formatRupiah(p.totalProfit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STOCK TAB */}
      {activeTab === 'stock' && (
        <div className="space-y-3">
          {loadingStock ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
          ) : movements.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <Package className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--muted-foreground)' }} />
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Belum ada pergerakan stok</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {movements.map((m) => {
                  const { color, bg, label } = movementColor(m.type)
                  const isOut = m.type === 'SALE'
                  return (
                    <div key={m.id} className="flex items-center justify-between px-4 py-3"
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                          {isOut
                            ? <ArrowDownRight className="w-4 h-4" style={{ color }} />
                            : m.type === 'PURCHASE'
                              ? <ArrowUpRight className="w-4 h-4" style={{ color }} />
                              : <Minus className="w-4 h-4" style={{ color }} />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                            {m.productName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: bg, color }}>
                              {label}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                              {m.userName} · {format(new Date(m.createdAt), 'd MMM, HH:mm', { locale: id })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: isOut ? '#ef4444' : '#22c55e' }}>
                          {isOut ? '-' : '+'}{m.quantity}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {m.stockBefore} → {m.stockAfter}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}