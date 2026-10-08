'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, getErrorMessage } from '@/lib/api'
import { formatRupiah, formatNumber, parseNumber } from '@/lib/format'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Plus, Loader2, ShoppingBag, X,
  ChevronDown, ChevronUp, Trash2, Search, PackagePlus
} from 'lucide-react'

interface Category { id: string; name: string }
interface Unit { id: string; name: string; symbol: string }

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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddCategoryId, setQuickAddCategoryId] = useState('')
  const [quickAddUnitId, setQuickAddUnitId] = useState('')
  const [quickAddSellPrice, setQuickAddSellPrice] = useState('')
  const [quickAddBuyPrice, setQuickAddBuyPrice] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)

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
      const [catRes, unitRes] = await Promise.all([
        api.get('/catalog/categories'),
        api.get('/catalog/units'),
      ])
      setCategories(catRes.data.data ?? [])
      setUnits(unitRes.data.data ?? [])
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

  const handleCloseAttempt = () => {
    if (items.length > 0) {
      const ok = confirm(
        `Batalkan pencatatan? ${items.length} produk yang sudah ditambahkan akan hilang.`
      )
      if (!ok) return
    }
    setDialogOpen(false)
    setQuickAddOpen(false)
  }

  const openQuickAdd = () => {
    setQuickAddName(productSearch.trim())
    setQuickAddCategoryId('')
    setQuickAddUnitId('')
    setQuickAddSellPrice('')
    setQuickAddBuyPrice('')
    setQuickAddOpen(true)
  }

  const closeQuickAdd = () => {
    setQuickAddOpen(false)
  }

  const handleQuickAddSave = async () => {
    if (!quickAddName.trim() || !quickAddUnitId || !quickAddSellPrice || !quickAddBuyPrice) {
      toast.error('Nama, satuan, harga beli, dan harga jual wajib diisi')
      return
    }
    setQuickAddSaving(true)
    try {
      const res = await api.post('/products', {
        name: quickAddName.trim(),
        categoryId: quickAddCategoryId || undefined,
        unitId: quickAddUnitId,
        sellPrice: Number(parseNumber(quickAddSellPrice)),
        buyPrice: Number(parseNumber(quickAddBuyPrice)),
      })
      toast.success('Produk baru berhasil dibuat')
      const newProduct: Product = res.data.data
      addItem(newProduct)
      setQuickAddOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setQuickAddSaving(false)
    }
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
      setQuickAddOpen(false)
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
    setQuickAddOpen(false)
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
            <div className="text-center px-4">
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
                <button
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(249,115,22,0.1)' }}
                    >
                      <ShoppingBag className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                        {p.invoiceNumber}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>
                        {format(new Date(p.createdAt), 'd MMM yyyy, HH:mm', { locale: id })}
                        {p.supplierName && ` · ${p.supplierName}`}
                        {` · ${p.userName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
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
                          className="flex items-center justify-between py-2 px-3 rounded-xl gap-3"
                          style={{ background: 'var(--card)' }}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                              {item.productName}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                              {item.quantity} {item.unitSymbol} × {formatRupiah(item.buyPrice)}
                            </p>
                          </div>
                          <p className="text-sm font-bold shrink-0" style={{ color: 'var(--primary)' }}>
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

      {/* Dialog — compact: max-w-lg, tinggi auto dengan cap 85vh */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={handleCloseAttempt}
        >
          <div
            className="w-full sm:max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — fixed */}
            <div
              className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="min-w-0">
                <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                  Catat Pembelian
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  Stok produk akan otomatis bertambah setelah disimpan
                </p>
              </div>
              <button
                onClick={handleCloseAttempt}
                className="p-1.5 rounded-lg shrink-0"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top section — supplier, catatan, search (fixed) */}
            <div
              className="shrink-0 px-4 sm:px-5 py-3 space-y-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    NAMA SUPPLIER
                  </label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    CATATAN
                  </label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
              </div>

              {/* Search produk */}
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                  TAMBAH PRODUK
                </label>
                <div className="relative">
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
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
                      className="flex-1 bg-transparent text-sm outline-none min-w-0"
                      style={{ color: 'var(--foreground)' }}
                    />
                    {productSearch && (
                      <button onClick={() => { setProductSearch(''); setSearchResults([]) }}>
                        <X className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                      </button>
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <div
                      className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-30 max-h-55 overflow-y-auto"
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
                          className="w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors gap-3"
                          style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span className="font-medium truncate" style={{ color: 'var(--foreground)' }}>
                            {p.name}
                          </span>
                          <span className="text-xs shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                            Stok: {p.stock} {p.unitSymbol}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {!searching && productSearch.trim() !== '' && searchResults.length === 0 && !quickAddOpen && (
                    <div
                      className="absolute top-full left-0 right-0 mt-1 rounded-xl p-2.5 z-30 flex items-center justify-between gap-2"
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      }}
                    >
                      <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                        &quot;{productSearch}&quot; belum terdaftar
                      </p>
                      <button
                        onClick={openQuickAdd}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0"
                        style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        Produk baru
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-3 space-y-3">
              {quickAddOpen && (
                <div
                  className="rounded-xl p-3 space-y-2.5"
                  style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)' }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                      PRODUK BARU
                    </p>
                    <button onClick={closeQuickAdd}>
                      <X className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                      NAMA PRODUK *
                    </label>
                    <input
                      type="text"
                      value={quickAddName}
                      onChange={(e) => setQuickAddName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                        KATEGORI
                      </label>
                      <div className="relative">
                        <select
                          value={quickAddCategoryId}
                          onChange={(e) => setQuickAddCategoryId(e.target.value)}
                          className="w-full appearance-none px-3 py-2 pr-8 rounded-lg text-sm outline-none"
                          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                        >
                          <option value="">Pilih</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <ChevronDown
                          className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: 'var(--muted-foreground)' }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                        SATUAN *
                      </label>
                      <div className="relative">
                        <select
                          value={quickAddUnitId}
                          onChange={(e) => setQuickAddUnitId(e.target.value)}
                          className="w-full appearance-none px-3 py-2 pr-8 rounded-lg text-sm outline-none"
                          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                        >
                          <option value="">Pilih</option>
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                          ))}
                        </select>
                        <ChevronDown
                          className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: 'var(--muted-foreground)' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                      HARGA JUAL *
                    </label>
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={quickAddSellPrice}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setQuickAddSellPrice(raw ? formatNumber(raw) : '')
                        }}
                        className="flex-1 bg-transparent text-sm outline-none min-w-0"
                        style={{ color: 'var(--foreground)' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                      HARGA BELI *
                    </label>
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={quickAddBuyPrice}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setQuickAddBuyPrice(raw ? formatNumber(raw) : '')
                        }}
                        className="flex-1 bg-transparent text-sm outline-none min-w-0"
                        style={{ color: 'var(--foreground)' }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleQuickAddSave}
                    disabled={quickAddSaving}
                    className="w-full py-2 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
                  >
                    {quickAddSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Buat & Tambahkan
                  </button>
                </div>
              )}

              {items.length > 0 ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    DAFTAR PRODUK ({items.length})
                  </label>
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="px-3 py-2.5 rounded-xl space-y-2"
                      style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                    >
                      {/* Baris 1: nama + hapus */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                          {item.productName}
                        </p>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="p-1 rounded-md shrink-0"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Baris 2: qty + harga + subtotal */}
                      <div className="flex items-center gap-2">
                        <div className="space-y-0.5">
                          <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Jml</p>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.productId, 'quantity', Number(e.target.value))}
                            className="w-14 px-2 py-1 rounded-md text-sm text-center outline-none"
                            style={{
                              background: 'var(--card)',
                              border: '1px solid var(--border)',
                              color: 'var(--foreground)',
                            }}
                          />
                        </div>

                        <div className="space-y-0.5 flex-1 min-w-0">
                          <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Harga Beli</p>
                          <div
                            className="flex items-center gap-1 px-2 py-1 rounded-md"
                            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                          >
                            <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatNumber(String(item.buyPrice))}
                              onChange={(e) => {
                                const raw = parseNumber(e.target.value)
                                updateItem(item.productId, 'buyPrice', Number(raw) || 0)
                              }}
                              className="w-full bg-transparent text-sm outline-none min-w-0"
                              style={{ color: 'var(--foreground)' }}
                            />
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>Subtotal</p>
                          <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                            {formatRupiah(item.buyPrice * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !quickAddOpen && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--muted)' }}
                  >
                    <Search className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                  </div>
                  <p className="text-xs text-center px-4" style={{ color: 'var(--muted-foreground)' }}>
                    Cari produk di atas untuk mulai mencatat pembelian.
                  </p>
                </div>
              )}
            </div>

            {/* Footer — fixed */}
            <div
              className="px-4 sm:px-5 py-3 shrink-0 space-y-2.5"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {items.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    Total Pembelian
                  </span>
                  <span className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleCloseAttempt}
                  className="flex-1 py-2 rounded-lg text-sm font-medium"
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
                  className="flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                  style={{
                    background: items.length === 0
                      ? 'var(--muted)'
                      : 'linear-gradient(135deg, #f97316, #f59e0b)',
                    color: items.length === 0 ? 'var(--muted-foreground)' : '#fff',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}