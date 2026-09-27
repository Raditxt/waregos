'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatRupiah } from '@/lib/format'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  ShoppingCart, DollarSign, TrendingUp, Package,
  Banknote, Smartphone, CreditCard, Loader2,
  CheckCircle2, XCircle, Clock, Calendar
} from 'lucide-react'

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
    QRIS: { count: number; total: number }
    DEBT: { count: number; total: number }
    TRANSFER: { count: number; total: number }
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
    const init = async () => { await fetchClosing(today) }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const run = async () => { await fetchClosing(selectedDate) }
    run()
  }, [selectedDate, fetchClosing])

  const actualCashNum = Number(actualCash.replace(/\./g, '') || 0)
  const cashDiff = data ? actualCashNum - data.expectedCash : 0

  const summaryCards = [
    {
      label: 'Total Transaksi',
      value: `${data?.totalTransactions ?? 0}`,
      sub: `${data?.cancelledTransactions ?? 0} dibatalkan`,
      icon: ShoppingCart,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      label: 'Total Omzet',
      value: formatRupiah(data?.totalRevenue ?? 0),
      sub: 'pendapatan kotor',
      icon: DollarSign,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.1)',
    },
    {
      label: 'Total Profit',
      value: formatRupiah(data?.totalProfit ?? 0),
      sub: 'keuntungan bersih',
      icon: TrendingUp,
      color: '#f97316',
      bg: 'rgba(249,115,22,0.1)',
    },
    {
      label: 'Item Terjual',
      value: `${data?.totalItems ?? 0}`,
      sub: 'dari semua transaksi',
      icon: Package,
      color: '#a855f7',
      bg: 'rgba(168,85,247,0.1)',
    },
  ]

  const paymentRows = [
    { key: 'CASH', label: 'Tunai', icon: Banknote, color: '#22c55e' },
    { key: 'QRIS', label: 'QRIS', icon: Smartphone, color: '#8b5cf6' },
    { key: 'DEBT', label: 'Hutang', icon: CreditCard, color: '#f59e0b' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Closing Harian
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Rekap & tutup buku akhir hari
          </p>
        </div>
        {/* Date picker */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <Calendar className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm outline-none"
            style={{ color: 'var(--foreground)' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Date label */}
          <div className="flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm">
              Laporan untuk {format(new Date(data.date + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id })}
            </span>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {summaryCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="rounded-2xl p-4"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                    {label}
                  </p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                </div>
                <p className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment breakdown */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Breakdown Metode Pembayaran
              </p>
              <div className="space-y-3">
                {paymentRows.map(({ key, label, icon: Icon, color }) => {
                  const method = data.byPaymentMethod[key as keyof typeof data.byPaymentMethod]
                  if (!method || method.count === 0) return null
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: `${color}18` }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{label}</p>
                          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{method.count} transaksi</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                        {formatRupiah(method.total)}
                      </p>
                    </div>
                  )
                })}
                {paymentRows.every(({ key }) => {
                  const m = data.byPaymentMethod[key as keyof typeof data.byPaymentMethod]
                  return !m || m.count === 0
                }) && (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--muted-foreground)' }}>
                    Tidak ada transaksi
                  </p>
                )}
              </div>
            </div>

            {/* Cash reconciliation */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Banknote className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  Rekonsiliasi Kas Tunai
                </p>
              </div>

              <div
                className="flex justify-between items-center py-2.5 mb-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Kas tunai dari sistem
                </span>
                <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                  {formatRupiah(data.expectedCash)}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                  KAS AKTUAL (HITUNG FISIK)
                </p>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={actualCash}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setActualCash(raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
                    }}
                    className="flex-1 bg-transparent text-sm outline-none font-bold"
                    style={{ color: 'var(--foreground)' }}
                  />
                </div>
              </div>

              {actualCash && (
                <div
                  className="flex items-center justify-between mt-3 px-4 py-3 rounded-xl"
                  style={{
                    background: cashDiff === 0
                      ? 'rgba(34,197,94,0.1)'
                      : cashDiff > 0
                        ? 'rgba(59,130,246,0.1)'
                        : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${cashDiff === 0 ? 'rgba(34,197,94,0.2)' : cashDiff > 0 ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {cashDiff === 0
                      ? <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />
                      : <XCircle className="w-4 h-4" style={{ color: cashDiff > 0 ? '#3b82f6' : '#ef4444' }} />
                    }
                    <span className="text-sm font-medium" style={{
                      color: cashDiff === 0 ? '#22c55e' : cashDiff > 0 ? '#3b82f6' : '#ef4444'
                    }}>
                      {cashDiff === 0 ? 'Kas sesuai!' : cashDiff > 0 ? 'Kas lebih' : 'Kas kurang'}
                    </span>
                  </div>
                  <span className="text-base font-bold" style={{
                    color: cashDiff === 0 ? '#22c55e' : cashDiff > 0 ? '#3b82f6' : '#ef4444'
                  }}>
                    {cashDiff > 0 ? '+' : ''}{formatRupiah(cashDiff)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Last transaction */}
          {data.lastTransaction && (
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted-foreground)' }}>
                  TRANSAKSI TERAKHIR
                </p>
                <p className="text-sm font-mono font-bold" style={{ color: 'var(--foreground)' }}>
                  {data.lastTransaction.invoiceNumber}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {format(new Date(data.lastTransaction.createdAt), 'HH:mm:ss')} WIB
                </p>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
                {formatRupiah(data.lastTransaction.totalAmount)}
              </p>
            </div>
          )}

          {/* Tutup buku */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: closingDone ? 'rgba(34,197,94,0.08)' : 'var(--card)',
              border: `1px solid ${closingDone ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
            }}
          >
            {closingDone ? (
              <div className="flex items-center justify-center gap-3 py-2">
                <CheckCircle2 className="w-5 h-5" style={{ color: '#22c55e' }} />
                <div>
                  <p className="font-bold" style={{ color: '#22c55e' }}>Closing selesai!</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {format(new Date(), 'HH:mm')} — Semua data sudah direkap.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    Selesai closing hari ini?
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    Pastikan kas sudah dihitung dan semua transaksi tercatat.
                  </p>
                </div>
                <button
                  onClick={() => setClosingDone(true)}
                  disabled={data.totalTransactions === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shrink-0 transition-all"
                  style={{
                    background: data.totalTransactions === 0
                      ? 'var(--muted)'
                      : 'linear-gradient(135deg, #f97316, #f59e0b)',
                    color: data.totalTransactions === 0 ? 'var(--muted-foreground)' : '#fff',
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Tutup Buku
                </button>
              </div>
            )}
          </div>

          {data.totalTransactions === 0 && (
            <p className="text-center text-sm py-4" style={{ color: 'var(--muted-foreground)' }}>
              Tidak ada transaksi pada tanggal ini
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}