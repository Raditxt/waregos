'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { api, getErrorMessage } from '@/lib/api'
import { formatRupiah, formatNumber, parseNumber } from '@/lib/format'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Search, X, Plus, Minus, Trash2, CheckCircle2,
  ShoppingCart, Loader2, CreditCard, Banknote,
  Smartphone, Receipt, Clock, AlertCircle
} from 'lucide-react'

interface Product {
  id: string
  name: string
  sellPrice: number
  buyPrice: number | null
  stock: number
  unitSymbol: string
  categoryName: string | null
}

interface CartItem {
  productId: string
  name: string
  sellPrice: number
  buyPrice: number | null
  quantity: number
  unitSymbol: string
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

type PaymentMethod = 'CASH' | 'QRIS' | 'DEBT'

const PAYMENT_METHODS: {
  key: PaymentMethod
  label: string
  icon: typeof Banknote
  color: string
}[] = [
  { key: 'CASH', label: 'Tunai', icon: Banknote, color: '#22c55e' },
  { key: 'QRIS', label: 'QRIS', icon: Smartphone, color: '#8b5cf6' },
  { key: 'DEBT', label: 'Hutang', icon: CreditCard, color: '#f59e0b' },
]

export default function PosPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [paidAmount, setPaidAmount] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([])
  const [qrisConfirmed, setQrisConfirmed] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<NodeJS.Timeout | null>(null)
  const customerTimer = useRef<NodeJS.Timeout | null>(null)

  const totalAmount = cart.reduce((s, i) => s + i.sellPrice * i.quantity, 0)
  const paidAmountNum = Number(parseNumber(paidAmount))
  const change = paidAmountNum - totalAmount
  const isMarginViolation = cart.some(
    i => i.buyPrice !== null && i.sellPrice <= i.buyPrice
  )

  // Search products
  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await api.get('/products', { params: { search: q, limit: 8 } })
      setSearchResults(res.data.data ?? [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => searchProducts(searchQuery), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQuery, searchProducts])

  // Customer autocomplete
  useEffect(() => {
    if (paymentMethod !== 'DEBT' || customerName.length < 2) {
      const t = setTimeout(() => setCustomerSuggestions([]), 0)
      return () => clearTimeout(t)
    }
    if (customerTimer.current) clearTimeout(customerTimer.current)
    customerTimer.current = setTimeout(async () => {
      try {
        const res = await api.get('/debts/search', { params: { q: customerName } })
        setCustomerSuggestions(res.data.data ?? [])
      } catch {
        setCustomerSuggestions([])
      }
    }, 300)
    return () => { if (customerTimer.current) clearTimeout(customerTimer.current) }
  }, [customerName, paymentMethod])

  const addToCart = (p: Product) => {
    if (p.stock <= 0) { toast.error('Stok habis'); return }
    setCart(prev => {
      const existing = prev.find(i => i.productId === p.id)
      if (existing) {
        if (existing.quantity >= p.stock) { toast.error('Stok tidak mencukupi'); return prev }
        return prev.map(i => i.productId === p.id
          ? { ...i, quantity: i.quantity + 1 }
          : i
        )
      }
      return [...prev, {
        productId: p.id,
        name: p.name,
        sellPrice: p.sellPrice,
        buyPrice: p.buyPrice,
        quantity: 1,
        unitSymbol: p.unitSymbol,
      }]
    })
    setSearchQuery('')
    setSearchResults([])
    searchRef.current?.focus()
  }

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.productId === productId
        ? { ...i, quantity: Math.max(0, i.quantity + delta) }
        : i
      )
      .filter(i => i.quantity > 0)
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  // Ganti metode bayar + reset state terkait (bukan via useEffect)
  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    if (method === paymentMethod) return
    setPaymentMethod(method)
    setQrisConfirmed(false)   // reset setiap ganti metode
  }

  const quickPay = (total: number): number[] => {
    const vals = new Set([
      total,
      Math.ceil(total / 5000) * 5000,
      Math.ceil(total / 10000) * 10000,
      Math.ceil(total / 50000) * 50000,
      Math.ceil(total / 100000) * 100000,
    ])
    return [...vals].filter(v => v >= total).sort((a, b) => a - b).slice(0, 4)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (isMarginViolation) { toast.error('Ada produk dengan harga jual ≤ harga beli'); return }
    if (paymentMethod === 'CASH' && paidAmountNum < totalAmount) {
      toast.error('Uang bayar kurang dari total')
      return
    }
    if (paymentMethod === 'DEBT' && !customerName.trim()) {
      toast.error('Nama pelanggan wajib diisi untuk transaksi hutang')
      return
    }
    if (paymentMethod === 'QRIS' && !qrisConfirmed) {
      toast.error('Konfirmasi pembayaran QRIS terlebih dahulu')
      return
    }

    setIsCheckingOut(true)
    try {
      const res = await api.post('/transactions', {
        items: cart.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          sellPrice: i.sellPrice,
        })),
        paymentMethod,
        paidAmount: paymentMethod === 'CASH' ? paidAmountNum : 0,
        customerName: paymentMethod === 'DEBT' ? customerName.trim() : undefined,
      })

      const trx = res.data.data
      setReceipt({
        invoiceNumber: trx.invoiceNumber,
        items: [...cart],
        totalAmount: trx.totalAmount,
        paidAmount: trx.paidAmount,
        changeAmount: trx.changeAmount,
        paymentMethod: trx.paymentMethod,
        customerName: paymentMethod === 'DEBT' ? customerName : undefined,
        createdAt: trx.createdAt,
      })
      setLastSaved(format(new Date(), 'HH:mm:ss'))
      setCart([])
      setPaidAmount('')
      setCustomerName('')
      setPaymentMethod('CASH')
      setQrisConfirmed(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)]">

      {/* LEFT — Search + Cart */}
      <div className="flex flex-col flex-1 min-w-0 gap-3">

        {/* Last saved marker */}
        {lastSaved && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Transaksi terakhir tersimpan: {lastSaved}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{
              background: 'var(--card)',
              border: '1.5px solid var(--border)',
            }}
          >
            {searching
              ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--muted-foreground)' }} />
              : <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
            }
            <input
              ref={searchRef}
              type="text"
              placeholder="Cari produk atau scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--foreground)' }}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}>
                <X className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              }}
            >
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors text-sm"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => {
                    if (p.stock > 0) e.currentTarget.style.background = 'var(--muted)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div>
                    <p className="font-medium" style={{
                      color: p.stock <= 0 ? 'var(--muted-foreground)' : 'var(--foreground)'
                    }}>
                      {p.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      Stok: {p.stock} {p.unitSymbol}
                      {p.categoryName && ` · ${p.categoryName}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-bold" style={{ color: 'var(--primary)' }}>
                      {formatRupiah(p.sellPrice)}
                    </p>
                    {p.stock <= 0 && (
                      <span className="text-xs" style={{ color: 'var(--error)' }}>Habis</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div
          className="flex-1 rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* Cart header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Keranjang
              </span>
              {cart.length > 0 && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--primary)', color: '#fff' }}
                >
                  {cart.length}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                style={{ color: 'var(--error)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--error-light)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Trash2 className="w-3 h-3" />
                Kosongkan
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--muted)' }}
                >
                  <ShoppingCart className="w-6 h-6" style={{ color: 'var(--muted-foreground)' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    Keranjang kosong
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    Cari produk di atas untuk memulai transaksi
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {cart.map((item) => {
                  const isViolation = item.buyPrice !== null && item.sellPrice <= item.buyPrice
                  return (
                    <div
                      key={item.productId}
                      className="flex items-center gap-3 px-4 py-3"
                      style={isViolation ? { background: 'rgba(239,68,68,0.05)' } : {}}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                            {item.name}
                          </p>
                          {isViolation && (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--error)' }} />
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                          {formatRupiah(item.sellPrice)} / {item.unitSymbol}
                        </p>
                      </div>

                      {/* Qty control */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateQty(item.productId, -1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--muted)'}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span
                          className="w-8 text-center text-sm font-bold"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.productId, 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--muted)'}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right shrink-0 min-w-20">
                        <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                          {formatRupiah(item.sellPrice * item.quantity)}
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1.5 rounded-lg transition-colors shrink-0"
                        style={{ color: 'var(--muted-foreground)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--error-light)'
                          e.currentTarget.style.color = 'var(--error)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--muted-foreground)'
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT — Payment Panel */}
      <div
        className="flex flex-col shrink-0 rounded-2xl overflow-hidden"
        style={{
          width: '300px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Total */}
        <div
          className="px-5 py-4 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #f97316, #f59e0b)',
          }}
        >
          <p className="text-sm text-white/80 mb-1">Total Belanja</p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {formatRupiah(totalAmount)}
          </p>
          {cart.length > 0 && (
            <p className="text-xs text-white/70 mt-1">
              {cart.reduce((s, i) => s + i.quantity, 0)} item
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Payment method */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>
              METODE BAYAR
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(({ key, label, icon: Icon, color }) => {
                const isSelected = paymentMethod === key
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectPaymentMethod(key)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: isSelected ? `${color}18` : 'var(--muted)',
                      border: `1.5px solid ${isSelected ? color : 'transparent'}`,
                      color: isSelected ? color : 'var(--muted-foreground)',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* CASH input */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>
                  UANG DITERIMA
                </p>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{
                    background: 'var(--muted)',
                    border: '1.5px solid var(--border)',
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={paidAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setPaidAmount(raw ? formatNumber(raw) : '')
                    }}
                    className="flex-1 bg-transparent text-sm font-bold outline-none"
                    style={{ color: 'var(--foreground)' }}
                  />
                </div>
              </div>

              {/* Quick pay */}
              {totalAmount > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quickPay(totalAmount).map(v => (
                    <button
                      key={v}
                      onClick={() => setPaidAmount(formatNumber(String(v)))}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                      style={{
                        background: paidAmountNum === v ? 'var(--primary)' : 'var(--muted)',
                        color: paidAmountNum === v ? '#fff' : 'var(--foreground)',
                        border: `1px solid ${paidAmountNum === v ? 'var(--primary)' : 'var(--border)'}`,
                      }}
                    >
                      {formatRupiah(v)}
                    </button>
                  ))}
                </div>
              )}

              {/* Change */}
              {paidAmount && (
                <div
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{
                    background: change >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${change >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}
                >
                  <span className="text-sm font-medium" style={{
                    color: change >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    Kembalian
                  </span>
                  <span className="text-sm font-bold" style={{
                    color: change >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    {formatRupiah(Math.max(0, change))}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* QRIS confirm */}
          {paymentMethod === 'QRIS' && (
            <div
              className="px-3 py-3 rounded-xl space-y-2"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
            >
              <p className="text-xs font-semibold" style={{ color: '#8b5cf6' }}>
                KONFIRMASI QRIS
              </p>
              <p className="text-xs" style={{ color: '#8b5cf6' }}>
                Pastikan notifikasi pembayaran QRIS sudah masuk sebelum menyelesaikan transaksi.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={qrisConfirmed}
                  onChange={(e) => setQrisConfirmed(e.target.checked)}
                  className="w-3.5 h-3.5 accent-violet-500"
                />
                <span className="text-xs font-medium" style={{ color: '#8b5cf6' }}>
                  QRIS sudah diterima
                </span>
              </label>
            </div>
          )}

          {/* DEBT customer */}
          {paymentMethod === 'DEBT' && (
            <div className="space-y-2 relative">
              <p className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                NAMA PELANGGAN
              </p>
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{
                  background: 'var(--muted)',
                  border: '1.5px solid var(--border)',
                }}
              >
                <input
                  type="text"
                  placeholder="Bu Sari, Pak Budi..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--foreground)' }}
                />
              </div>

              {/* Autocomplete */}
              {customerSuggestions.length > 0 && (
                <div
                  className="absolute left-0 right-0 rounded-xl overflow-hidden z-10"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    top: '100%',
                    marginTop: '4px',
                  }}
                >
                  {customerSuggestions.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setCustomerName(name)
                        setCustomerSuggestions([])
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--foreground)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              <div
                className="px-3 py-2 rounded-xl text-xs text-center"
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  color: '#f59e0b',
                }}
              >
                {formatRupiah(totalAmount)} akan dicatat sebagai hutang
              </div>
            </div>
          )}
        </div>

        {/* Checkout button */}
        <div className="px-4 py-4 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          {isMarginViolation && (
            <p className="text-xs text-center mb-2" style={{ color: 'var(--error)' }}>
              ⚠️ Ada produk dengan harga jual ≤ harga beli
            </p>
          )}
          <button
            onClick={handleCheckout}
            disabled={
              isCheckingOut ||
              cart.length === 0 ||
              isMarginViolation ||
              (paymentMethod === 'CASH' && paidAmountNum < totalAmount) ||
              (paymentMethod === 'DEBT' && !customerName.trim()) ||
              (paymentMethod === 'QRIS' && !qrisConfirmed)
            }
            className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: cart.length === 0 || isMarginViolation
                ? 'var(--muted)'
                : 'linear-gradient(135deg, #f97316, #f59e0b)',
              color: cart.length === 0 || isMarginViolation ? 'var(--muted-foreground)' : '#fff',
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {isCheckingOut
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCircle2 className="w-4 h-4" />
            }
            {isCheckingOut ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
        </div>
      </div>

      {/* Receipt Dialog */}
      {receipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setReceipt(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Receipt header */}
            <div
              className="px-6 py-5 text-center"
              style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
            >
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <p className="text-white font-bold text-lg">Transaksi Berhasil!</p>
              <p className="text-white/80 text-xs mt-1 font-mono">{receipt.invoiceNumber}</p>
            </div>

            <div className="px-6 py-4 space-y-3">
              {/* Time */}
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                <Clock className="w-3 h-3" />
                {format(new Date(receipt.createdAt), 'd MMM yyyy, HH:mm:ss', { locale: id })}
              </div>

              {/* Items */}
              <div className="space-y-2">
                {receipt.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      {item.name} ×{item.quantity}
                    </span>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {formatRupiah(item.sellPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px' }} className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span style={{ color: 'var(--foreground)' }}>Total</span>
                  <span style={{ color: 'var(--foreground)' }}>{formatRupiah(receipt.totalAmount)}</span>
                </div>

                {receipt.paymentMethod === 'CASH' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--muted-foreground)' }}>Bayar (Tunai)</span>
                      <span style={{ color: 'var(--foreground)' }}>{formatRupiah(receipt.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span style={{ color: '#22c55e' }}>Kembalian</span>
                      <span style={{ color: '#22c55e' }}>{formatRupiah(receipt.changeAmount)}</span>
                    </div>
                  </>
                )}

                {receipt.paymentMethod === 'DEBT' && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#f59e0b' }}>Hutang atas nama</span>
                    <span className="font-bold" style={{ color: '#f59e0b' }}>{receipt.customerName}</span>
                  </div>
                )}

                {receipt.paymentMethod === 'QRIS' && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#8b5cf6' }}>QRIS</span>
                    <span className="font-bold" style={{ color: '#8b5cf6' }}>{formatRupiah(receipt.totalAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-5">
              <button
                onClick={() => setReceipt(null)}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
              >
                <Receipt className="w-4 h-4 inline mr-2" />
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}