'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  TrendingUp, DollarSign, ShoppingCart,
  Package, Loader2, ArrowUp, ArrowDown
} from 'lucide-react'
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { format, subDays } from 'date-fns'
import { id } from 'date-fns/locale'

interface DailySummary {
  date: string
  totalTransactions: number
  totalRevenue: number
  totalProfit: number
  totalItemsSold: number
}

interface MonthlyData {
  year: number
  month: number
  totalTransactions: number
  totalRevenue: number
  totalProfit: number
  daily: DailySummary[]
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
  createdAt: string
}

const MOVEMENT_LABELS: Record<string, { label: string; color: string }> = {
  PURCHASE_IN:    { label: 'Pembelian Masuk', color: 'bg-green-100 text-green-700' },
  SALE_OUT:       { label: 'Penjualan Keluar', color: 'bg-red-100 text-red-700' },
  ADJUSTMENT_IN:  { label: 'Penyesuaian +', color: 'bg-blue-100 text-blue-700' },
  ADJUSTMENT_OUT: { label: 'Penyesuaian -', color: 'bg-orange-100 text-orange-700' },
  RETURN_IN:      { label: 'Retur Masuk', color: 'bg-purple-100 text-purple-700' },
}

export default function ReportsPage() {
  const now = new Date()
  const [selectedDate, setSelectedDate] = useState(format(now, 'yyyy-MM-dd'))
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [loadingDaily, setLoadingDaily] = useState(false)
  const [loadingMonthly, setLoadingMonthly] = useState(false)
  const [loadingTop, setLoadingTop] = useState(false)
  const [loadingMovements, setLoadingMovements] = useState(false)

  const fetchDaily = async (date: string) => {
    setLoadingDaily(true)
    try {
      const res = await api.get('/reports/summary', { params: { date } })
      setDailySummary(res.data.data)
    } finally {
      setLoadingDaily(false)
    }
  }

  const fetchMonthly = async (year: number, month: number) => {
    setLoadingMonthly(true)
    try {
      const res = await api.get('/reports/monthly', { params: { year, month } })
      setMonthlyData(res.data.data)
    } finally {
      setLoadingMonthly(false)
    }
  }

  const fetchTopProducts = async () => {
    setLoadingTop(true)
    try {
      const dateFrom = format(subDays(now, 30), 'yyyy-MM-dd')
      const dateTo = format(now, 'yyyy-MM-dd')
      const res = await api.get('/reports/top-products', {
        params: { limit: 10, dateFrom, dateTo }
      })
      setTopProducts(res.data.data)
    } finally {
      setLoadingTop(false)
    }
  }

  const fetchStockMovements = async () => {
    setLoadingMovements(true)
    try {
      const res = await api.get('/reports/stock-movements', { params: { limit: 30 } })
      setStockMovements(res.data.data)
    } finally {
      setLoadingMovements(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const dateFrom = format(subDays(now, 30), 'yyyy-MM-dd')
      const dateTo = format(now, 'yyyy-MM-dd')

      setLoadingDaily(true)
      setLoadingMonthly(true)
      setLoadingTop(true)
      setLoadingMovements(true)

      const [summaryRes, monthlyRes, topRes, movRes] = await Promise.allSettled([
        api.get('/reports/summary', { params: { date: selectedDate } }),
        api.get('/reports/monthly', { params: { year: selectedYear, month: selectedMonth } }),
        api.get('/reports/top-products', { params: { limit: 10, dateFrom, dateTo } }),
        api.get('/reports/stock-movements', { params: { limit: 30 } }),
      ])

      if (summaryRes.status === 'fulfilled') setDailySummary(summaryRes.value.data.data)
      if (monthlyRes.status === 'fulfilled') setMonthlyData(monthlyRes.value.data.data)
      if (topRes.status === 'fulfilled') setTopProducts(topRes.value.data.data)
      if (movRes.status === 'fulfilled') setStockMovements(movRes.value.data.data)

      setLoadingDaily(false)
      setLoadingMonthly(false)
      setLoadingTop(false)
      setLoadingMovements(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(n)

  const summaryCards = dailySummary ? [
    {
      title: 'Transaksi',
      value: dailySummary.totalTransactions,
      suffix: 'transaksi',
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      title: 'Omzet',
      value: formatRupiah(dailySummary.totalRevenue),
      suffix: 'pendapatan',
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      title: 'Profit',
      value: formatRupiah(dailySummary.totalProfit),
      suffix: 'keuntungan',
      icon: TrendingUp,
      color: 'text-emerald-500',
    },
    {
      title: 'Item Terjual',
      value: dailySummary.totalItemsSold,
      suffix: 'item',
      icon: Package,
      color: 'text-orange-500',
    },
  ] : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan</h1>
        <p className="text-muted-foreground text-sm mt-1">Analitik penjualan & pergerakan stok</p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="daily">Harian</TabsTrigger>
          <TabsTrigger value="monthly">Bulanan</TabsTrigger>
          <TabsTrigger value="products">Produk</TabsTrigger>
          <TabsTrigger value="stock">Stok</TabsTrigger>
        </TabsList>

        {/* ── DAILY ── */}
        <TabsContent value="daily" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Input
              type="date"
              className="w-48"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <Button onClick={() => fetchDaily(selectedDate)} disabled={loadingDaily}>
              {loadingDaily ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tampilkan'}
            </Button>
          </div>

          {loadingDaily ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : dailySummary ? (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {summaryCards.map(({ title, value, suffix, icon: Icon, color }) => (
                  <Card key={title}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{suffix}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {dailySummary.totalTransactions === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Tidak ada transaksi pada tanggal ini
                </div>
              )}
            </>
          ) : null}
        </TabsContent>

        {/* ── MONTHLY ── */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              className="w-28"
              placeholder="Tahun"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            />
            <Input
              type="number"
              className="w-20"
              placeholder="Bulan"
              min={1} max={12}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            />
            <Button
              onClick={() => fetchMonthly(selectedYear, selectedMonth)}
              disabled={loadingMonthly}
            >
              {loadingMonthly ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tampilkan'}
            </Button>
          </div>

          {loadingMonthly ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : monthlyData ? (
            <div className="space-y-4">
              {/* Monthly summary cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { title: 'Total Transaksi', value: monthlyData.totalTransactions, icon: ShoppingCart, color: 'text-blue-500' },
                  { title: 'Total Omzet', value: formatRupiah(monthlyData.totalRevenue), icon: DollarSign, color: 'text-green-500' },
                  { title: 'Total Profit', value: formatRupiah(monthlyData.totalProfit), icon: TrendingUp, color: 'text-emerald-500' },
                  { title: 'Margin', value: monthlyData.totalRevenue > 0 ? `${((monthlyData.totalProfit / monthlyData.totalRevenue) * 100).toFixed(1)}%` : '0%', icon: Package, color: 'text-orange-500' },
                ].map(({ title, value, icon: Icon, color }) => (
                  <Card key={title}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Chart */}
              {monthlyData.daily.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Grafik {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: id })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={monthlyData.daily}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => format(new Date(v), 'd', { locale: id })}
                          className="text-xs"
                        />
                        <YAxis
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          className="text-xs"
                        />
                        <Tooltip
                          formatter={(value) => formatRupiah(Number(value))}
                          labelFormatter={(label) => format(new Date(label), 'd MMMM yyyy', { locale: id })}
                        />
                        <Legend />
                        <Bar dataKey="totalRevenue" name="Omzet" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="totalProfit" name="Profit" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Tidak ada data transaksi bulan ini
                </div>
              )}

              {/* Daily breakdown table */}
              {monthlyData.daily.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rincian Harian</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead className="text-center">Transaksi</TableHead>
                          <TableHead className="text-right">Omzet</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyData.daily.map((d) => (
                          <TableRow key={d.date}>
                            <TableCell>
                              {format(new Date(d.date), 'EEEE, d MMM', { locale: id })}
                            </TableCell>
                            <TableCell className="text-center">{d.totalTransactions}</TableCell>
                            <TableCell className="text-right">{formatRupiah(d.totalRevenue)}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium">
                              {formatRupiah(d.totalProfit)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </TabsContent>

        {/* ── TOP PRODUCTS ── */}
        <TabsContent value="products" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Produk terlaris 30 hari terakhir</p>
            <Button variant="outline" size="sm" onClick={fetchTopProducts} disabled={loadingTop}>
              {loadingTop ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          {loadingTop ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : topProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Belum ada data penjualan
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top 10 Produk Terlaris (Qty)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis
                        type="category"
                        dataKey="productName"
                        width={120}
                        className="text-xs"
                        tickFormatter={(v) => v.length > 14 ? v.slice(0, 14) + '…' : v}
                      />
                      <Tooltip />
                      <Bar dataKey="totalQuantity" name="Qty Terjual" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Omzet</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((p, i) => (
                        <TableRow key={p.productId}>
                          <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{p.productName}</TableCell>
                          <TableCell className="text-center">{p.totalQuantity} {p.unit}</TableCell>
                          <TableCell className="text-right">{formatRupiah(p.totalRevenue)}</TableCell>
                          <TableCell className="text-right text-emerald-600">
                            {formatRupiah(p.totalProfit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── STOCK MOVEMENTS ── */}
        <TabsContent value="stock" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">30 pergerakan stok terakhir</p>
            <Button variant="outline" size="sm" onClick={fetchStockMovements} disabled={loadingMovements}>
              {loadingMovements ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          {loadingMovements ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-center">Stok</TableHead>
                      <TableHead>Oleh</TableHead>
                      <TableHead>Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMovements.map((m) => {
                      const isIn = m.type.endsWith('_IN')
                      const meta = MOVEMENT_LABELS[m.type]
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.productName}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta?.color ?? ''}`}>
                              {meta?.label ?? m.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`flex items-center justify-center gap-1 font-medium ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                              {isIn ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                              {m.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {m.stockBefore} → {m.stockAfter}
                          </TableCell>
                          <TableCell className="text-sm">{m.userName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(m.createdAt), 'd MMM, HH:mm', { locale: id })}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}