'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ShoppingCart, DollarSign, TrendingUp,
  Package, Banknote, Smartphone, Building2,
  Loader2, CheckCircle2, XCircle, Clock
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface ClosingData {
  date: string
  totalTransactions: number
  cancelledTransactions: number
  totalRevenue: number
  totalProfit: number
  totalItems: number
  expectedCash: number
  byPaymentMethod: {
    CASH: { count: number; total: number }
    TRANSFER: { count: number; total: number }
    QRIS: { count: number; total: number }
  }
  lastTransaction: {
    invoiceNumber: string
    createdAt: string
    totalAmount: number
  } | null
}

export default function ClosingPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)
  const [data, setData] = useState<ClosingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [actualCash, setActualCash] = useState('')
  const [closingDone, setClosingDone] = useState(false)

  const fetchClosing = useCallback(async (date: string) => {
    setLoading(true)
    setActualCash('')
    setClosingDone(false)
    try {
      const res = await api.get('/reports/closing', { params: { date } })
      setData(res.data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await fetchClosing(selectedDate)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(n)

  const cashDiff = data ? Number(actualCash.replace(/\./g, '') || 0) - data.expectedCash : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Closing Harian</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rekap & tutup buku akhir hari
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            className="w-44"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <div className="space-y-6">

          {/* Tanggal */}
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" />
            <span>
              Laporan untuk {format(new Date(data.date + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id })}
            </span>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                title: 'Total Transaksi',
                value: data.totalTransactions,
                sub: `${data.cancelledTransactions} dibatalkan`,
                icon: ShoppingCart,
                color: 'text-blue-500'
              },
              {
                title: 'Total Omzet',
                value: formatRupiah(data.totalRevenue),
                sub: 'pendapatan kotor',
                icon: DollarSign,
                color: 'text-green-500'
              },
              {
                title: 'Total Profit',
                value: formatRupiah(data.totalProfit),
                sub: 'keuntungan bersih',
                icon: TrendingUp,
                color: 'text-emerald-500'
              },
              {
                title: 'Item Terjual',
                value: data.totalItems,
                sub: 'dari semua transaksi',
                icon: Package,
                color: 'text-orange-500'
              },
            ].map(({ title, value, sub, icon: Icon, color }) => (
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

          {/* Breakdown per Metode Bayar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Breakdown Metode Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'CASH', label: 'Tunai', icon: Banknote, color: 'text-green-600' },
                  { key: 'TRANSFER', label: 'Transfer', icon: Building2, color: 'text-blue-600' },
                  { key: 'QRIS', label: 'QRIS', icon: Smartphone, color: 'text-purple-600' },
                ].map(({ key, label, icon: Icon, color }) => {
                  const method = data.byPaymentMethod[key as keyof typeof data.byPaymentMethod]
                  return (
                    <div key={key} className="text-center p-4 rounded-lg bg-muted/50">
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-lg font-bold mt-1">{formatRupiah(method.total)}</p>
                      <p className="text-xs text-muted-foreground">{method.count} transaksi</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Cash Reconciliation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="w-4 h-4" />
                Rekonsiliasi Kas Tunai
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Kas tunai dari sistem</span>
                <span className="font-bold">{formatRupiah(data.expectedCash)}</span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Kas tunai aktual (hitung fisik)</p>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="pl-9"
                    value={actualCash}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                      setActualCash(formatted)
                    }}
                  />
                </div>
              </div>

              {actualCash && (
                <div className={`rounded-lg p-4 ${cashDiff === 0
                  ? 'bg-green-50 dark:bg-green-950'
                  : cashDiff > 0
                    ? 'bg-blue-50 dark:bg-blue-950'
                    : 'bg-red-50 dark:bg-red-950'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {cashDiff === 0
                        ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                        : <XCircle className="w-5 h-5 text-red-600" />
                      }
                      <span className="font-medium text-sm">
                        {cashDiff === 0
                          ? 'Kas sesuai!'
                          : cashDiff > 0
                            ? 'Kas lebih'
                            : 'Kas kurang'
                        }
                      </span>
                    </div>
                    <span className={`text-xl font-bold ${cashDiff === 0
                      ? 'text-green-600'
                      : cashDiff > 0
                        ? 'text-blue-600'
                        : 'text-red-600'
                      }`}>
                      {cashDiff > 0 ? '+' : ''}{formatRupiah(cashDiff)}
                    </span>
                  </div>
                  {cashDiff !== 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {cashDiff > 0
                        ? 'Kas fisik lebih dari catatan sistem. Periksa apakah ada transaksi yang belum tercatat.'
                        : 'Kas fisik kurang dari catatan sistem. Periksa kembali hitungan atau transaksi hari ini.'
                      }
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaksi Terakhir */}
          {data.lastTransaction && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transaksi Terakhir</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm">{data.lastTransaction.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(data.lastTransaction.createdAt), 'HH:mm:ss', { locale: id })} WIB
                    </p>
                  </div>
                  <p className="font-bold text-lg">
                    {formatRupiah(data.lastTransaction.totalAmount)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tutup Buku */}
          <Card className={closingDone ? 'border-green-200 dark:border-green-800' : ''}>
            <CardContent className="pt-6">
              {closingDone ? (
                <div className="flex items-center justify-center gap-3 py-4 text-green-600">
                  <CheckCircle2 className="w-6 h-6" />
                  <div>
                    <p className="font-bold">Closing selesai!</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(), 'HH:mm', { locale: id })} — Semua data sudah direkap.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Selesai closing hari ini?</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pastikan kas sudah dihitung dan semua transaksi sudah tercatat.
                    </p>
                  </div>
                  <Button
                    onClick={() => setClosingDone(true)}
                    disabled={data.totalTransactions === 0}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Tutup Buku
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* No transaction state */}
          {data.totalTransactions === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Tidak ada transaksi pada tanggal ini
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}