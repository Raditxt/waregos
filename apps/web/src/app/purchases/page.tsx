'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, getErrorMessage } from '@/lib/api'
import { formatRupiah, formatNumber, parseNumber } from '@/lib/format'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Plus, Loader2, ShoppingBag, X,
  ChevronDown, ChevronUp, Trash2, Search
} from 'lucide-react'

interface Product {
  id: string
  name: string
  unitSymbol: string
  buyPrice: number | null
  stock: number
}

interface PurchaseItem {
  productId: string
  productName: string
  quantity: number
  buyPrice: number
  unitSymbol: string
}

interface Purchase {
  id: string
  invoiceNumber: string
  supplierName: string | null
  totalAmount: number
  notes: string | null
  createdAt: string
  userName: string
  items: PurchaseItem[]
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 20

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)

  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalAmount = items.reduce((s, i) => s + i.buyPrice * i.quantity, 0)

  const fetchPurchases = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await api.get('/purchases', { params: { page: p, limit } })
      setPurchases(res.data.data ?? [])
      setTotal(res.data.meta?.total ?? 0)
      setPage(p)
    } catch {
      toast.error('Gagal memuat data pembelian')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await fetchPurchases()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
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
    const t = setTimeout(() => searchProducts(productSearch), 300)
    return () => clearTimeout(t)
  }, [productSearch, searchProducts])

  const addItem = (p: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === p.id)
      if (existing) {
        return prev.map(i => i.productId === p.id
          ? { ...i, quantity: i.quantity + 1 }
          : i
        )
      }
      return [...prev, {
        productId: p.id,
        productName: p.name,
        quantity: 1,
        buyPrice: p.buyPrice ?? 0,
        unitSymbol: p.unitSymbol,
      }]
    })
    setProductSearch('')
    setSearchResults([])
  }

  const updateItem = (productId: string, field: 'quantity' | 'buyPrice', value: number) => {
    setItems(prev => prev.map(i =>
      i.productId === productId ? { ...i, [field]: value } : i
    ))
  }

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId))
  }

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('Tambahkan minimal 1 produk')
      return
    }
    if (items.some(i => i.buyPrice <= 0 || i.quantity <= 0)) {
      toast.error('Harga beli dan jumlah harus lebih dari 0')
      return
    }
    setSaving(true)
    try {
      await api.post('/purchases', {
        supplierName: supplierName || undefined,
        notes: notes || undefined,
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          buyPrice: i.buyPrice,
        })),
      })
      toast.success('Pembelian berhasil dicatat')
      setDialogOpen(false)
      setItems([])
      setSupplierName('')
      setNotes('')
      fetchPurchases(1)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const openDialog = () => {
    setItems([])
    setSupplierName('')
    setNotes('')
    setProductSearch('')
    setSearchResults([])
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Pembelian
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {total} riwayat pembelian
          </p>
        </div>
        <button
          onClick={openDialog}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
        >
          <Plus className="w-4 h-4" />
          Catat Pembelian
        </button>
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
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--muted)' }}
            >
              <ShoppingBag className="w-6 h-6" style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Belum ada data pembelian
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Catat setiap pembelian atau restok barang dengan klik Catat Pembelian.
                Stok akan otomatis bertambah setelah pembelian dicatat.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {purchases.map((p) => (
              <div key={p.id}>
                {/* Row */}
                <button
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(249,115,22,0.1)' }}
                    >
                      <ShoppingBag className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                        {p.invoiceNumber}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        {format(new Date(p.createdAt), 'd MMM yyyy, HH:mm', { locale: id })}
                        {p.supplierName && ` · ${p.supplierName}`}
                        {` · ${p.userName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                        {formatRupiah(p.totalAmount)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {p.items.length} item
                      </p>
                    </div>
                    {expandedId === p.id
                      ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                    }
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedId === p.id && (
                  <div
                    className="px-4 pb-4"
                    style={{ borderTop: '1px solid var(--border)', background: 'var(--muted)' }}
                  >
                    {p.notes && (
                      <p className="text-xs py-2" style={{ color: 'var(--muted-foreground)' }}>
                        📝 {p.notes}
                      </p>
                    )}
                    <div className="mt-2 space-y-2">
                      {p.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-2 px-3 rounded-xl"
                          style={{ background: 'var(--card)' }}
                        >
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                              {item.productName}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                              {item.quantity} {item.unitSymbol} × {formatRupiah(item.buyPrice)}
                            </p>
                          </div>
                          <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                            {formatRupiah(item.buyPrice * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Halaman {page} dari {Math.ceil(total / limit)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchPurchases(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: 'var(--muted)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() => fetchPurchases(page + 1)}
                disabled={page >= Math.ceil(total / limit)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: 'var(--muted)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  opacity: page >= Math.ceil(total / limit) ? 0.5 : 1,
                }}
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Catat Pembelian */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                  Catat Pembelian
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  Stok produk akan otomatis bertambah setelah disimpan
                </p>
              </div>
              <button
                onClick={() => setDialogOpen(false)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Supplier + Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    NAMA SUPPLIER
                  </label>
                  <input
                    type="text"
                    placeholder="Opsional — nama supplier"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    CATATAN
                  </label>
                  <input
                    type="text"
                    placeholder="Opsional — keterangan pembelian"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
              </div>

              {/* Search produk */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                  TAMBAH PRODUK
                </label>
                <div className="relative">
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {searching
                      ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                      : <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                    }
                    <input
                      type="text"
                      placeholder="Cari produk untuk direstok..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: 'var(--foreground)' }}
                    />
                    {productSearch && (
                      <button onClick={() => { setProductSearch(''); setSearchResults([]) }}>
                        <X className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown hasil pencarian */}
                  {searchResults.length > 0 && (
                    <div
                      className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10"
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      }}
                    >
                      {searchResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => addItem(p)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors"
                          style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                            {p.name}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            Stok: {p.stock} {p.unitSymbol}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items list */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    DAFTAR PRODUK ({items.length} item)
                  </label>
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                          {item.productName}
                        </p>
                      </div>

                      {/* Jumlah */}
                      <div className="space-y-0.5">
                        <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>Jumlah</p>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.productId, 'quantity', Number(e.target.value))}
                          className="w-16 px-2 py-1.5 rounded-lg text-sm text-center outline-none"
                          style={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            color: 'var(--foreground)',
                          }}
                        />
                      </div>

                      {/* Harga beli */}
                      <div className="space-y-0.5">
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Harga Beli</p>
                        <div
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg"
                          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                        >
                          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatNumber(String(item.buyPrice))}
                            onChange={(e) => {
                              const raw = parseNumber(e.target.value)
                              updateItem(item.productId, 'buyPrice', Number(raw) || 0)
                            }}
                            className="w-24 bg-transparent text-sm outline-none"
                            style={{ color: 'var(--foreground)' }}
                          />
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right min-w-20">
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Subtotal</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                          {formatRupiah(item.buyPrice * item.quantity)}
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-1.5 rounded-lg shrink-0 transition-colors"
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
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 shrink-0 space-y-3"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {/* Total */}
              {items.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    Total Pembelian
                  </span>
                  <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: 'var(--muted)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || items.length === 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{
                    background: items.length === 0
                      ? 'var(--muted)'
                      : 'linear-gradient(135deg, #f97316, #f59e0b)',
                    color: items.length === 0 ? 'var(--muted-foreground)' : '#fff',
                  }}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Pembelian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}