'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, getErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Plus, Loader2, CreditCard,
  ArrowUpCircle, ArrowDownCircle, History
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

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
  const [debtForm, setDebtForm] = useState({ customerName: '', amount: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ customerName: '', amount: '', notes: '' })

  const fetchDebts = useCallback(async () => {
    try {
      const res = await api.get('/debts')
      setDebts(res.data.data)
    } catch {
      toast.error('Gagal memuat data hutang')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => { await fetchDebts() }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openHistory = async (customerName: string) => {
    setSelectedCustomer(customerName)
    setHistoryOpen(true)
    setHistoryLoading(true)
    try {
      const res = await api.get(`/debts/${encodeURIComponent(customerName)}`)
      setHistory(res.data.data.history)
      setTotalDebt(res.data.data.totalDebt)
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

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(n)

  const totalOutstanding = debts.reduce((s, d) => s + d.totalDebt, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Hutang Pelanggan
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {debts.length} pelanggan · Total outstanding{' '}
            <span className="font-medium text-red-600">{formatRupiah(totalOutstanding)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPaymentOpen(true)}>
            <ArrowDownCircle className="w-4 h-4 mr-2 text-green-600" />
            Catat Bayar
          </Button>
          <Button onClick={() => setAddDebtOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Catat Hutang
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : debts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <CreditCard className="w-12 h-12" />
          <p className="font-medium">Tidak ada hutang outstanding</p>
          <p className="text-sm text-center max-w-sm">
            Catat hutang pelanggan dengan klik 
            <span className="font-medium text-foreground"> Catat Hutang </span>
            atau langsung dari halaman Kasir dengan metode bayar 
            <span className="font-medium text-foreground"> Hutang</span>.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {debts.map((d) => (
            <Card key={d.customerName}>
              <CardContent className="flex items-center justify-between py-4">
                {/* Info pelanggan */}
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-semibold text-base truncate">{d.customerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.transactionCount} transaksi · Terakhir{' '}
                    {format(new Date(d.lastActivity), 'd MMM yyyy', { locale: id })}
                  </p>
                </div>

                {/* Jumlah hutang */}
                <div className="text-right mr-3 shrink-0">
                  <p className="text-lg font-bold text-red-600 whitespace-nowrap">
                    {formatRupiah(d.totalDebt)}
                  </p>
                  <p className="text-xs text-muted-foreground">belum lunas</p>
                </div>

                {/* Tombol history — terpisah dari card */}
                <Button
                  size="icon"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => openHistory(d.customerName)}
                  title="Lihat riwayat hutang"
                >
                  <History className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{selectedCustomer}</DialogTitle>
            {/* Total hutang di bawah nama, tidak bertabrakan dengan X */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-sm text-muted-foreground">Total hutang</p>
              <p className="text-xl font-bold text-red-600">{formatRupiah(totalDebt)}</p>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <>
                {/* Quick pay */}
                {totalDebt > 0 && (
                  <Button className="w-full" variant="outline" onClick={() => {
                    setHistoryOpen(false)
                    setPaymentForm({
                      customerName: selectedCustomer ?? '',
                      amount: '',
                      notes: 'Bayar hutang'
                    })
                    setPaymentOpen(true)
                  }}>
                    <ArrowDownCircle className="w-4 h-4 mr-2 text-green-600" />
                    Catat Pembayaran
                  </Button>
                )}

                <Separator />

                {/* Timeline */}
                {history.map((h) => (
                  <div key={h.id} className={`rounded-lg p-3 ${
                    h.type === 'DEBT'
                      ? 'bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900'
                      : 'bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900'
                  }`}>
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="shrink-0 mt-0.5">
                        {h.type === 'DEBT'
                          ? <ArrowUpCircle className="w-4 h-4 text-red-500" />
                          : <ArrowDownCircle className="w-4 h-4 text-green-600" />
                        }
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {h.type === 'DEBT' ? 'Ambil hutang' : 'Bayar hutang'}
                        </p>
                        {h.notes && (
                          <p className="text-xs text-muted-foreground">{h.notes}</p>
                        )}
                        {h.items && h.items.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {h.items.map((item, i) => (
                              <p key={i} className="text-xs text-muted-foreground">
                                • {item.name} ×{item.quantity} = {formatRupiah(item.price * item.quantity)}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(h.createdAt), 'd MMM yyyy, HH:mm', { locale: id })}
                          {' '}· {h.createdBy}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="shrink-0 text-right">
                        <p className={`font-bold text-sm whitespace-nowrap ${
                          h.type === 'DEBT' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {h.type === 'DEBT' ? '+' : '-'}{formatRupiah(h.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          sisa {formatRupiah(h.balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Debt Dialog */}
      <Dialog open={addDebtOpen} onOpenChange={setAddDebtOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Catat Hutang Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Pelanggan *</Label>
              <Input
                placeholder="Bu Sari, Pak Budi, dll"
                value={debtForm.customerName}
                onChange={(e) => setDebtForm({ ...debtForm, customerName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Hutang *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className="pl-9"
                  value={debtForm.amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '')
                    setDebtForm({ ...debtForm, amount: raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') })
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Input
                placeholder="Indomie 2, Aqua 1, dll"
                value={debtForm.notes}
                onChange={(e) => setDebtForm({ ...debtForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDebtOpen(false)}>Batal</Button>
            <Button onClick={handleAddDebt} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Catat Hutang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Hutang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Pelanggan *</Label>
              <Input
                placeholder="Bu Sari, Pak Budi, dll"
                value={paymentForm.customerName}
                onChange={(e) => setPaymentForm({ ...paymentForm, customerName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Jumlah Bayar *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className="pl-9"
                  value={paymentForm.amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '')
                    setPaymentForm({ ...paymentForm, amount: raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') })
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Input
                placeholder="Bayar sebagian, lunas, dll"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Batal</Button>
            <Button onClick={handlePayment} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Catat Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}