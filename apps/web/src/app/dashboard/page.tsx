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

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [monthly, setMonthly] = useState<MonthlyDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const now = new Date()

    Promise.all([
      api.get(`/reports/summary?date=${today}`),
      api.get(`/reports/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
    ]).then(([summaryRes, monthlyRes]) => {
      setSummary(summaryRes.data.data)
      setMonthly(monthlyRes.data.data.daily ?? [])
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