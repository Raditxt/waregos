'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, getErrorMessage } from '@/lib/api'
import { formatRupiah } from '@/lib/format'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Plus, Loader2, CreditCard, ArrowUpCircle,
  ArrowDownCircle, X, Loader2 as SpinIcon
} from 'lucide-react'

interface DebtSummary {
  customerName: string
  totalDebt: number
  lastActivity: string
  transactionCount: number
}

interface DebtHistoryItem {
  id: string
  type: string
  amount: number
  balance: number
  items: Array<{ name: string; quantity: number; price: number }> | null
  notes: string | null
  invoiceNumber: string | null
  createdBy: string
  createdAt: string
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<DebtSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [history, setHistory] = useState<DebtHistoryItem[]>([])
  const [totalDebt, setTotalDebt] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [addDebtOpen, setAddDebtOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [debtForm, setDebtForm] = useState({ customerName: '', amount: '', notes: '' })
  const [paymentForm, setPaymentForm] = useState({ customerName: '', amount: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const totalOutstanding = debts.reduce((s, d) => s + d.totalDebt, 0)

  const fetchDebts = useCallback(async () => {
    try {
      const res = await api.get('/debts')
      setDebts(res.data.data ?? [])
    } catch {
      toast.error('Gagal memuat data hutang')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => { await fetchDebts() }
    init()
  }, [fetchDebts])

  const openHistory = async (customerName: string) => {
    setSelectedCustomer(customerName)
    setHistoryOpen(true)
    setHistoryLoading(true)
    try {
      const res = await api.get(`/debts/${encodeURIComponent(customerName)}`)
      setHistory(res.data.data.history ?? [])
      setTotalDebt(res.data.data.totalDebt ?? 0)
    } catch {
      toast.error('Gagal memuat riwayat hutang')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleAddDebt = async () => {
    if (!debtForm.customerName || !debtForm.amount) {
      toast.error('Nama pelanggan dan jumlah hutang wajib diisi')
      return
    }
    setSaving(true)
    try {
      await api.post('/debts', {
        customerName: debtForm.customerName,
        amount: Number(debtForm.amount.replace(/\./g, '')),
        notes: debtForm.notes || undefined,
      })
      toast.success('Hutang berhasil dicatat')
      setAddDebtOpen(false)
      setDebtForm({ customerName: '', amount: '', notes: '' })
      fetchDebts()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePayment = async () => {
    if (!paymentForm.customerName || !paymentForm.amount) {
      toast.error('Nama pelanggan dan jumlah bayar wajib diisi')
      return
    }
    setSaving(true)
    try {
      await api.post('/debts/payment', {
        customerName: paymentForm.customerName,
        amount: Number(paymentForm.amount.replace(/\./g, '')),
        notes: paymentForm.notes || 'Bayar hutang',
      })
      toast.success('Pembayaran berhasil dicatat')
      setPaymentOpen(false)
      setPaymentForm({ customerName: '', amount: '', notes: '' })
      fetchDebts()
      if (historyOpen && selectedCustomer === paymentForm.customerName) {
        openHistory(paymentForm.customerName)
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Hutang Pelanggan
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {debts.length} pelanggan · Total{' '}
            <span className="font-semibold" style={{ color: '#ef4444' }}>
              {formatRupiah(totalOutstanding)}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPaymentOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(34,197,94,0.1)',
              color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.2)',
            }}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Catat Bayar
          </button>
          <button
            onClick={() => setAddDebtOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
          >
            <Plus className="w-4 h-4" />
            Catat Hutang
          </button>
        </div>
      </div>

      {/* List */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        ) : debts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--muted)' }}>
              <CreditCard className="w-6 h-6" style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Tidak ada hutang outstanding
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Catat hutang pelanggan dengan klik Catat Hutang atau dari Kasir dengan metode bayar Hutang.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {debts.map((d) => (
              <button
                key={d.customerName}
                onClick={() => openHistory(d.customerName)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                  >
                    {d.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                      {d.customerName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      {d.transactionCount} transaksi · Terakhir{' '}
                      {format(new Date(d.lastActivity), 'd MMM yyyy', { locale: id })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold" style={{ color: '#ef4444' }}>
                    {formatRupiah(d.totalDebt)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>belum lunas</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* History Bottom Sheet */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="w-full lg:max-w-lg rounded-t-2xl lg:rounded-2xl max-h-[85vh] flex flex-col"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar — mobile only */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <p className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                  {selectedCustomer}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  Total hutang:{' '}
                  <span className="font-bold" style={{ color: '#ef4444' }}>
                    {formatRupiah(totalDebt)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick pay button */}
            {totalDebt > 0 && (
              <div className="px-5 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => {
                    setHistoryOpen(false)
                    setPaymentForm({
                      customerName: selectedCustomer ?? '',
                      amount: '',
                      notes: 'Bayar hutang',
                    })
                    setPaymentOpen(true)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: 'rgba(34,197,94,0.1)',
                    color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  Catat Pembayaran
                </button>
              </div>
            )}

            {/* History list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <SpinIcon className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
              ) : history.length === 0 ? (
                <p className="text-center text-sm py-8" style={{ color: 'var(--muted-foreground)' }}>
                  Belum ada riwayat
                </p>
              ) : (
                history.map((h) => {
                  const isDebt = h.type === 'DEBT'
                  return (
                    <div
                      key={h.id}
                      className="rounded-xl p-3"
                      style={{
                        background: isDebt ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
                        border: `1px solid ${isDebt ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          {isDebt
                            ? <ArrowUpCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
                            : <ArrowDownCircle className="w-4 h-4" style={{ color: '#22c55e' }} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                            {isDebt ? 'Ambil hutang' : 'Bayar hutang'}
                          </p>
                          {h.notes && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                              {h.notes}
                            </p>
                          )}
                          {h.items && h.items.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {h.items.map((item, i) => (
                                <p key={i} className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                  • {item.name} ×{item.quantity} = {formatRupiah(item.price * item.quantity)}
                                </p>
                              ))}
                            </div>
                          )}
                          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                            {format(new Date(h.createdAt), 'd MMM yyyy, HH:mm', { locale: id })} · {h.createdBy}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold" style={{ color: isDebt ? '#ef4444' : '#22c55e' }}>
                            {isDebt ? '+' : '-'}{formatRupiah(h.amount)}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            sisa {formatRupiah(h.balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Debt Dialog */}
      {addDebtOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setAddDebtOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="font-bold" style={{ color: 'var(--foreground)' }}>Catat Hutang Baru</p>
              <button onClick={() => setAddDebtOpen(false)} style={{ color: 'var(--muted-foreground)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>NAMA PELANGGAN *</label>
                <input
                  type="text"
                  placeholder="Bu Sari, Pak Budi..."
                  value={debtForm.customerName}
                  onChange={(e) => setDebtForm({ ...debtForm, customerName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>TOTAL HUTANG *</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={debtForm.amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setDebtForm({ ...debtForm, amount: raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') })
                    }}
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--foreground)' }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>CATATAN (OPSIONAL)</label>
                <input
                  type="text"
                  placeholder="Indomie 2, Aqua 1..."
                  value={debtForm.notes}
                  onChange={(e) => setDebtForm({ ...debtForm, notes: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setAddDebtOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                Batal
              </button>
              <button
                onClick={handleAddDebt}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Catat Hutang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      {paymentOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setPaymentOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="font-bold" style={{ color: 'var(--foreground)' }}>Catat Pembayaran</p>
              <button onClick={() => setPaymentOpen(false)} style={{ color: 'var(--muted-foreground)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>NAMA PELANGGAN *</label>
                <input
                  type="text"
                  placeholder="Bu Sari, Pak Budi..."
                  value={paymentForm.customerName}
                  onChange={(e) => setPaymentForm({ ...paymentForm, customerName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>JUMLAH BAYAR *</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={paymentForm.amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setPaymentForm({ ...paymentForm, amount: raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') })
                    }}
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--foreground)' }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>CATATAN (OPSIONAL)</label>
                <input
                  type="text"
                  placeholder="Bayar sebagian, lunas..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setPaymentOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                Batal
              </button>
              <button
                onClick={handlePayment}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'rgba(34,197,94,0.9)' }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Catat Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}