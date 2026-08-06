'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, ShoppingCart, Package, DollarSign, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

interface Summary {
  date: string
  totalTransactions: number
  totalRevenue: number
  totalProfit: number
  totalItemsSold: number
}

interface MonthlyDay {
  date: string
  totalRevenue: number
  totalProfit: number
  totalTransactions: number
}

interface DeadStockItem {
  id: string
  name: string
  stock: number
  unit: string
  category: string | null
  stockValue: number
  daysSinceLastSold: number | null
  status: string
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [monthly, setMonthly] = useState<MonthlyDay[]>([])
  const [loading, setLoading] = useState(true)
  const [expiringSoon, setExpiringSoon] = useState<Array<{
    id: string
    name: string
    stock: number
    unit: string
    expiryDate: string
    daysLeft: number
    status: string
  }>>([])
  const [deadStock, setDeadStock] = useState<DeadStockItem[]>([])  // <-- state baru

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const now = new Date()

    Promise.all([
      api.get(`/reports/summary?date=${today}`),
      api.get(`/reports/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`),
      api.get('/products/expiring-soon'),
      api.get('/products/dead-stock')  // <-- tambahan fetch dead stock
    ]).then(([summaryRes, monthlyRes, expiringRes, deadStockRes]) => {
      setSummary(summaryRes.data.data)
      setMonthly(monthlyRes.data.data.daily ?? [])
      setExpiringSoon(expiringRes.data.data ?? [])
      setDeadStock(deadStockRes.data.data ?? [])
    }).catch((error) => {
      console.error('Failed to load dashboard data:', error)
    }).finally(() => setLoading(false))
  }, [])

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const cards = [
    {
      title: 'Transaksi Hari Ini',
      value: summary?.totalTransactions ?? 0,
      sub: 'transaksi',
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      title: 'Omzet Hari Ini',
      value: formatRupiah(summary?.totalRevenue ?? 0),
      sub: 'pendapatan',
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      title: 'Profit Hari Ini',
      value: formatRupiah(summary?.totalProfit ?? 0),
      sub: 'keuntungan bersih',
      icon: TrendingUp,
      color: 'text-emerald-500',
    },
    {
      title: 'Item Terjual',
      value: summary?.totalItemsSold ?? 0,
      sub: 'item hari ini',
      icon: Package,
      color: 'text-orange-500',
    },
  ]

  // Hitung total modal tertahan dari dead stock
  const totalDeadStockValue = deadStock.reduce((sum, p) => sum + p.stockValue, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Selamat datang, {user?.name} · {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ title, value, sub, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className={`w-4 h-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expiry Alert */}
      {expiringSoon.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-600">
              <Package className="w-4 h-4" />
              Peringatan Produk ({expiringSoon.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringSoon.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground ml-2">
                      (stok: {p.stock} {p.unit})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(p.expiryDate), 'd MMM yyyy', { locale: id })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === 'expired'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {p.status === 'expired' ? 'Kadaluarsa' : `${p.daysLeft} hari lagi`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dead Stock Alert */}
      {deadStock.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
              <Package className="w-4 h-4" />
              Dead Stock ({deadStock.length} produk — modal tertahan Rp {totalDeadStockValue.toLocaleString('id-ID')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deadStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground ml-2">
                      ({p.stock} {p.unit})
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.status === 'never_sold'
                      ? 'bg-yellow-100 text-yellow-700'
                      : p.status === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                  }`}>
                    {p.status === 'never_sold'
                      ? 'Belum pernah terjual'
                      : p.status === 'critical'
                        ? `${p.daysSinceLastSold} hari tidak terjual`
                        : `${p.daysSinceLastSold} hari`
                    }
                  </span>
                </div>
              ))}
              {deadStock.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{deadStock.length - 5} produk lainnya
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Omzet Bulan Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Belum ada data transaksi bulan ini
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => format(new Date(v), 'd MMM', { locale: id })}
                  className="text-xs"
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value) => typeof value === 'number' ? formatRupiah(value) : ''}
                  labelFormatter={(label) => format(new Date(label), 'd MMMM yyyy', { locale: id })}
                />
                <Line
                  type="monotone"
                  dataKey="totalRevenue"
                  name="Omzet"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="totalProfit"
                  name="Profit"
                  stroke="hsl(142 76% 36%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}