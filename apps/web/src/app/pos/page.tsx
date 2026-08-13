'use client'

import { useEffect, useState, useRef } from 'react'
import { api, getErrorMessage } from '@/lib/api'
import { ProductDto } from '@waregos/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import {
  Plus, Minus, Trash2,
  ShoppingCart, Banknote, CheckCircle2,
  Loader2, ScanLine
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface CartItem {
  productId: string
  name: string
  unitSymbol: string
  sellPrice: number
  quantity: number
  stock: number
}

interface Receipt {
  invoiceNumber: string
  items: CartItem[]
  totalAmount: number
  paidAmount: number
  changeAmount: number
  paymentMethod: string
  customerName?: string
  createdAt: string
}

export default function PosPage() {
  const [products, setProducts] = useState<ProductDto[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'QRIS' | 'DEBT'>('CASH')
  const [customerName, setCustomerName] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([])
  const [paidAmount, setPaidAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // State untuk ConfirmDialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    onConfirm: () => void
  }>({ open: false, onConfirm: () => {} })

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products', {
          params: { search, limit: 20 }
        })
        setProducts(res.data.data)
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    }
    fetchProducts()
  }, [search])

  // Fetch customer suggestions for DEBT
  useEffect(() => {
    if (paymentMethod !== 'DEBT' || customerName.length < 2) {
      const timer = setTimeout(() => setCustomerSuggestions([]), 0)
      return () => clearTimeout(timer)
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get('/debts/search', { params: { q: customerName } })
        setCustomerSuggestions(res.data.data)
      } catch {
        setCustomerSuggestions([])
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [customerName, paymentMethod])

  const addToCart = (product: ProductDto) => {
    if (product.stock <= 0) {
      toast.error(`Stok ${product.name} habis`)
      return
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Stok ${product.name} tidak cukup (sisa: ${product.stock})`)
          return prev
        }
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        unitSymbol: product.unitSymbol,
        sellPrice: product.sellPrice,
        quantity: 1,
        stock: product.stock,
      }]
    })
    setSearch('')
    searchRef.current?.focus()
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i
        const newQty = i.quantity + delta
        if (newQty <= 0) return i
        if (newQty > i.stock) {
          toast.error(`Stok tidak cukup (sisa: ${i.stock})`)
          return i
        }
        return { ...i, quantity: newQty }
      })
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  const clearCart = () => {
    if (cart.length === 0) return
    setConfirmDialog({
      open: true,
      onConfirm: () => {
        setCart([])
        setPaidAmount('')
        setCustomerName('')
        setConfirmDialog(prev => ({ ...prev, open: false }))
      }
    })
  }

  const totalAmount = cart.reduce((sum, i) => sum + i.sellPrice * i.quantity, 0)
  const changeAmount = Number(paidAmount) - totalAmount

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong')
      return
    }
    if (paymentMethod === 'CASH' && (!paidAmount || Number(paidAmount) < totalAmount)) {
      toast.error('Uang bayar kurang dari total')
      return
    }
    if (paymentMethod === 'DEBT' && !customerName.trim()) {
      toast.error('Nama pelanggan wajib diisi untuk transaksi hutang')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/transactions', {
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          sellPrice: i.sellPrice,
        })),
        paymentMethod,
        paidAmount: paymentMethod === 'CASH' ? Number(paidAmount) : 0,
        customerName: paymentMethod === 'DEBT' ? customerName.trim() : undefined,
        notes: undefined,
      })

      const trx = res.data.data
      setReceipt({
        invoiceNumber: trx.invoiceNumber,
        items: cart,
        totalAmount: trx.totalAmount,
        paidAmount: trx.paidAmount,
        changeAmount: trx.changeAmount,
        paymentMethod: trx.paymentMethod,
        customerName: paymentMethod === 'DEBT' ? customerName : undefined,
        createdAt: trx.createdAt,
      })
      setReceiptOpen(true)
      setCart([])
      setPaidAmount('')
      setCustomerName('')
      toast.success('Transaksi berhasil!')
      setLastSaved(new Date().toISOString())
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(n)

  const quickPay = [
    totalAmount,
    Math.ceil(totalAmount / 5000) * 5000,
    Math.ceil(totalAmount / 10000) * 10000,
    Math.ceil(totalAmount / 50000) * 50000,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= totalAmount).slice(0, 4)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Kasir / POS</h1>
        <p className="text-muted-foreground text-sm mt-1">Input transaksi penjualan</p>
      </div>

      {/* Last Transaction Marker */}
      {lastSaved && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-green-50 dark:bg-green-950 px-3 py-2 rounded-lg">
          <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
          <span>
            Transaksi terakhir tersimpan:{' '}
            <span className="font-medium text-green-700 dark:text-green-400">
              {format(new Date(lastSaved), 'HH:mm:ss', { locale: id })}
            </span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT — Product Search */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              className="pl-9 text-base"
              placeholder="Cari produk atau scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Product Grid */}
          {search && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.length === 0 ? (
                <p className="col-span-3 text-center text-muted-foreground py-8 text-sm">
                  Produk tidak ditemukan
                </p>
              ) : (
                products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.stock <= 0}
                    className="text-left p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <p className="font-medium text-sm leading-tight">{p.name}</p>
                    <p className="text-primary font-bold text-sm mt-1">{formatRupiah(p.sellPrice)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant={p.stock <= p.minStock ? 'destructive' : 'secondary'} className="text-xs">
                        {p.stock} {p.unitSymbol}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Cart Table */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Keranjang
                {cart.length > 0 && (
                  <Badge>{cart.length} item</Badge>
                )}
              </CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={clearCart}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Kosongkan
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Belum ada produk — cari produk di atas
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatRupiah(item.sellPrice)} / {item.unitSymbol}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7"
                          onClick={() => updateQty(item.productId, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7"
                          onClick={() => updateQty(item.productId, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-bold w-24 text-right">
                        {formatRupiah(item.sellPrice * item.quantity)}
                      </p>
                      <Button size="icon" variant="ghost" className="text-destructive h-7 w-7"
                        onClick={() => removeFromCart(item.productId)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Payment Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="w-4 h-4" />
                Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total */}
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Belanja</p>
                <p className="text-3xl font-bold">{formatRupiah(totalAmount)}</p>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Metode Bayar</p>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">💵 Tunai</SelectItem>
                    <SelectItem value="TRANSFER">🏦 Transfer</SelectItem>
                    <SelectItem value="QRIS">📱 QRIS</SelectItem>
                    <SelectItem value="DEBT">📋 Hutang</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer name untuk DEBT */}
              {paymentMethod === 'DEBT' && (
                <div className="space-y-2 relative">
                  <p className="text-sm font-medium">Nama Pelanggan *</p>
                  <Input
                    placeholder="Bu Sari, Pak Budi..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    autoComplete="off"
                  />
                  {customerSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-card border rounded-lg shadow-lg">
                      {customerSuggestions.map((name) => (
                        <button
                          key={name}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => {
                            setCustomerName(name)
                            setCustomerSuggestions([])
                          }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cash Payment — hanya untuk CASH */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uang Diterima</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className="pl-9 text-lg font-bold"
                      value={paidAmount ? paidAmount.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '')
                        setPaidAmount(raw)
                      }}
                    />
                  </div>
                  {/* Quick Pay Buttons */}
                  {totalAmount > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {quickPay.map((v) => (
                        <Button
                          key={v}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setPaidAmount(String(v))}
                        >
                          {formatRupiah(v)}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DEBT info */}
              {paymentMethod === 'DEBT' && (
                <div className="rounded-lg p-3 bg-orange-50 dark:bg-orange-950 text-center">
                  <p className="text-xs text-muted-foreground">Total akan dicatat sebagai hutang</p>
                  <p className="text-lg font-bold text-orange-600">{formatRupiah(totalAmount)}</p>
                </div>
              )}

              {/* Change — hanya untuk CASH */}
              {paymentMethod === 'CASH' && paidAmount && (
                <div className={`rounded-lg p-3 text-center ${changeAmount >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                  <p className="text-xs text-muted-foreground">Kembalian</p>
                  <p className={`text-xl font-bold ${changeAmount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {formatRupiah(Math.max(0, changeAmount))}
                  </p>
                </div>
              )}

              <Separator />

              {/* Checkout Button */}
              <Button
                className="w-full h-12 text-base"
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
              >
                {loading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <><CheckCircle2 className="w-5 h-5 mr-2" />Bayar Sekarang</>
                }
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Transaksi Berhasil!
            </DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="space-y-3 text-sm">
              <div className="text-center py-2 border-b">
                <p className="font-mono text-xs text-muted-foreground">{receipt.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(receipt.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="space-y-1">
                {receipt.items.map((item) => (
                  <div key={item.productId} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium">
                      {formatRupiah(item.sellPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatRupiah(receipt.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Bayar ({receipt.paymentMethod})</span>
                  <span>{formatRupiah(receipt.paidAmount)}</span>
                </div>
                {receipt.paymentMethod === 'CASH' && (
                  <div className="flex justify-between text-green-600 font-bold">
                    <span>Kembalian</span>
                    <span>{formatRupiah(receipt.changeAmount)}</span>
                  </div>
                )}
                {receipt.paymentMethod === 'DEBT' && (
                  <div className="flex justify-between text-orange-600 font-bold">
                    <span>Hutang atas nama</span>
                    <span>{receipt.customerName}</span>
                  </div>
                )}
              </div>
              <Button className="w-full mt-2" onClick={() => setReceiptOpen(false)}>
                Transaksi Baru
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title="Kosongkan Keranjang"
        description="Semua item di keranjang akan dihapus. Lanjutkan?"
        confirmLabel="Ya, Kosongkan"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </div>
  )
}