'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { api, getErrorMessage } from '@/lib/api'
import { formatRupiah, formatNumber, parseNumber } from '@/lib/format'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Plus, Loader2, ShoppingBag, X, ChevronDown, ChevronUp,
  Trash2, Search, PackagePlus, AlertTriangle,
} from 'lucide-react'

type Kind = 'PURCHASE' | 'OPENING'

interface Category { id: string; name: string }
interface Unit { id: string; name: string; symbol: string }

interface Product {
  id: string
  name: string
  unitSymbol: string
  buyPrice: number | null
  sellPrice: number
  stock: number
}

// Satu baris batch di form. Produk yang sama boleh muncul beberapa kali (beda kedaluwarsa).
interface DraftLine {
  key: string
  productId: string
  productName: string
  unitSymbol: string
  quantity: number
  buyPrice: number
  expiry: string // 'YYYY-MM' atau ''
  stock: number // stok produk saat ditambahkan (untuk pratinjau)
  currentCost: number | null
  sellPrice: number
}

interface PurchaseItem {
  productName: string
  unitSymbol: string
  quantity: number
  buyPrice: number
  expiryDate: string | null
}

interface Purchase {
  id: string
  invoiceNumber: string
  kind: Kind
  supplierName: string | null
  supplierRef: string | null
  totalAmount: number
  notes: string | null
  createdAt: string
  userName: string
  items: PurchaseItem[]
}

const fieldStyle: CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}
const mutedText: CSSProperties = { color: 'var(--muted-foreground)' }
const mutedField: CSSProperties = {
  background: 'var(--muted)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}

let lineSeq = 0
const nextKey = () => `line-${++lineSeq}`

function makeLine(p: Product): DraftLine {
  return {
    key: nextKey(),
    productId: p.id,
    productName: p.name,
    unitSymbol: p.unitSymbol,
    quantity: 1,
    buyPrice: p.buyPrice !== null ? Math.round(p.buyPrice) : 0,
    expiry: '',
    stock: p.stock,
    currentCost: p.buyPrice,
    sellPrice: p.sellPrice,
  }
}

// Rumus yang sama dengan server (rata-rata bergerak), dihitung berurutan per produk.
function previewCosts(lines: DraftLine[]) {
  const map = new Map<string, { stockAfter: number; costBefore: number | null; costAfter: number | null }>()
  for (const l of lines) {
    const cur = map.get(l.productId) ?? {
      stockAfter: l.stock,
      costBefore: l.currentCost,
      costAfter: l.currentCost,
    }
    if (l.quantity > 0 && l.buyPrice > 0) {
      cur.costAfter =
        cur.stockAfter <= 0 || cur.costAfter === null
          ? l.buyPrice
          : Math.round(
              ((cur.stockAfter * cur.costAfter + l.quantity * l.buyPrice) /
                (cur.stockAfter + l.quantity)) * 100
            ) / 100
      cur.stockAfter += l.quantity
    }
    map.set(l.productId, cur)
  }
  return map
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-xs font-semibold" style={mutedText}>
      {children}
    </label>
  )
}

function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  bg = 'card',
}: {
  value: number
  onChange: (n: number) => void
  placeholder?: string
  bg?: 'card' | 'muted'
}) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1.5 rounded-md"
      style={bg === 'card' ? fieldStyle : mutedField}
    >
      <span className="text-[10px]" style={mutedText}>Rp</span>
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value > 0 ? formatNumber(String(value)) : ''}
        onChange={(e) => onChange(Number(parseNumber(e.target.value)) || 0)}
        className="w-full bg-transparent text-sm outline-none min-w-0"
        style={{ color: 'var(--foreground)' }}
      />
    </div>
  )
}

function formatExpiry(date: string) {
  return format(new Date(`${date}T00:00:00`), 'd MMM yyyy', { locale: id })
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [kindFilter, setKindFilter] = useState<'' | Kind>('')
  const limit = 20

  const [dialogOpen, setDialogOpen] = useState(false)
  const [kind, setKind] = useState<Kind>('PURCHASE')
  const [saving, setSaving] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [supplierRef, setSupplierRef] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftLine[]>([])
  const [newSell, setNewSell] = useState<Record<string, number>>({})
  const [productSearch, setProductSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickCategoryId, setQuickCategoryId] = useState('')
  const [quickUnitId, setQuickUnitId] = useState('')
  const [quickSell, setQuickSell] = useState(0)
  const [quickBuy, setQuickBuy] = useState(0)
  const [quickSaving, setQuickSaving] = useState(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalAmount = items.reduce((s, i) => s + i.buyPrice * i.quantity, 0)
  const preview = useMemo(() => previewCosts(items), [items])
  const groups = useMemo(() => {
    const order: string[] = []
    const byProduct = new Map<string, DraftLine[]>()
    for (const l of items) {
      if (!byProduct.has(l.productId)) {
        byProduct.set(l.productId, [])
        order.push(l.productId)
      }
      byProduct.get(l.productId)!.push(l)
    }
    return order.map((productId) => ({ productId, lines: byProduct.get(productId)! }))
  }, [items])

  const fetchPurchases = useCallback(async (p = 1, f: '' | Kind = '') => {
    setLoading(true)
    try {
      const res = await api.get('/purchases', {
        params: { page: p, limit, ...(f ? { kind: f } : {}) },
      })
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
      try {
        const [catRes, unitRes] = await Promise.all([
          api.get('/catalog/categories'),
          api.get('/catalog/units'),
        ])
        setCategories(catRes.data.data ?? [])
        setUnits(unitRes.data.data ?? [])
      } catch {
        toast.error('Gagal memuat kategori dan satuan')
      }
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

  const clearSearch = () => {
    setProductSearch('')
    setSearchResults([])
  }

  const addProduct = (p: Product) => {
    setItems((prev) => {
      let at = -1
      prev.forEach((i, idx) => { if (i.productId === p.id) at = idx })
      if (at >= 0) {
        // Produk sudah ada: tambah jumlah pada batch terakhirnya
        return prev.map((i, idx) => (idx === at ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, makeLine(p)]
    })
    clearSearch()
  }

  const addBatch = (productId: string) => {
    setItems((prev) => {
      let at = -1
      prev.forEach((i, idx) => { if (i.productId === productId) at = idx })
      if (at < 0) return prev
      const copy = [...prev]
      copy.splice(at + 1, 0, { ...prev[at], key: nextKey(), quantity: 1, expiry: '' })
      return copy
    })
  }

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  const removeLine = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }

  const removeProduct = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
    setNewSell((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }

  const handleCloseAttempt = () => {
    if (items.length > 0) {
      const ok = confirm(
        `Batalkan pencatatan? ${groups.length} produk yang sudah ditambahkan akan hilang.`
      )
      if (!ok) return
    }
    setDialogOpen(false)
    setQuickAddOpen(false)
  }

  const openDialog = (k: Kind) => {
    setKind(k)
    setItems([])
    setNewSell({})
    setSupplierName('')
    setSupplierRef('')
    setNotes('')
    clearSearch()
    setQuickAddOpen(false)
    setDialogOpen(true)
  }

  const openQuickAdd = () => {
    setQuickName(productSearch.trim())
    setQuickCategoryId('')
    setQuickUnitId('')
    setQuickSell(0)
    setQuickBuy(0)
    setQuickAddOpen(true)
  }

  const handleQuickAddSave = async () => {
    if (!quickName.trim() || !quickUnitId || !quickSell || !quickBuy) {
      toast.error('Nama, satuan, harga beli, dan harga jual wajib diisi')
      return
    }
    setQuickSaving(true)
    try {
      const res = await api.post('/products', {
        name: quickName.trim(),
        categoryId: quickCategoryId || undefined,
        unitId: quickUnitId,
        sellPrice: quickSell,
        buyPrice: quickBuy,
      })
      toast.success('Produk baru berhasil dibuat')
      addProduct(res.data.data as Product)
      setQuickAddOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setQuickSaving(false)
    }
  }

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('Tambahkan minimal 1 produk')
      return
    }
    if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity <= 0 || i.buyPrice <= 0)) {
      toast.error('Jumlah (bilangan bulat) dan harga beli harus lebih dari 0')
      return
    }
    if (kind === 'OPENING') {
      const ok = confirm(
        `Simpan saldo awal untuk ${groups.length} produk?\n` +
        'Stok akan bertambah sesuai jumlah ini dan tidak dihitung sebagai pengeluaran.'
      )
      if (!ok) return
    }

    setSaving(true)
    try {
      await api.post('/purchases', {
        kind,
        ...(kind === 'PURCHASE' && supplierName.trim() ? { supplierName: supplierName.trim() } : {}),
        ...(kind === 'PURCHASE' && supplierRef.trim() ? { supplierRef: supplierRef.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          buyPrice: i.buyPrice,
          ...(i.expiry ? { expiryDate: i.expiry } : {}),
        })),
      })

      // Harga jual baru (opsional) lewat edit produk, hanya bila diisi dan berbeda
      const failed: string[] = []
      if (kind === 'PURCHASE') {
        for (const g of groups) {
          const first = g.lines[0]
          const price = newSell[g.productId] ?? 0
          if (price > 0 && price !== first.sellPrice) {
            try {
              await api.patch(`/products/${g.productId}`, { sellPrice: price })
            } catch {
              failed.push(first.productName)
            }
          }
        }
      }

      if (failed.length > 0) {
        toast.error(`Pembelian tersimpan, tetapi harga jual gagal diubah: ${failed.join(', ')}`)
      } else {
        toast.success(kind === 'OPENING' ? 'Saldo awal berhasil dicatat' : 'Pembelian berhasil dicatat')
      }
      setDialogOpen(false)
      setQuickAddOpen(false)
      setItems([])
      setNewSell({})
      fetchPurchases(1, kindFilter)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const changeFilter = (f: '' | Kind) => {
    setKindFilter(f)
    fetchPurchases(1, f)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Pembelian
          </h1>
          <p className="text-sm mt-0.5" style={mutedText}>
            {total} riwayat
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openDialog('OPENING')}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          >
            Saldo Awal
          </button>
          <button
            onClick={() => openDialog('PURCHASE')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
          >
            <Plus className="w-4 h-4" />
            Catat Pembelian
          </button>
        </div>
      </div>

      {/* Filter jenis */}
      <div className="flex gap-2">
        {([['', 'Semua'], ['PURCHASE', 'Pembelian'], ['OPENING', 'Saldo awal']] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => changeFilter(value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: kindFilter === value ? 'var(--primary-light)' : 'var(--muted)',
              color: kindFilter === value ? 'var(--primary)' : 'var(--muted-foreground)',
              border: '1px solid var(--border)',
            }}
          >
            {label}
          </button>
        ))}
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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--muted)' }}>
              <ShoppingBag className="w-6 h-6" style={mutedText} />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Belum ada data
              </p>
              <p className="text-xs mt-1" style={mutedText}>
                Barang baru dari grosir dicatat lewat Catat Pembelian. Stok yang sudah ada di toko
                dicatat sekali lewat Saldo Awal.
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
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(249,115,22,0.1)' }}
                    >
                      <ShoppingBag className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                        {p.invoiceNumber}
                        {p.kind === 'OPENING' && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                          >
                            SALDO AWAL
                          </span>
                        )}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={mutedText}>
                        {format(new Date(p.createdAt), 'd MMM yyyy, HH:mm', { locale: id })}
                        {p.supplierName && ` · ${p.supplierName}`}
                        {p.supplierRef && ` · Nota ${p.supplierRef}`}
                        {` · ${p.userName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p
                        className="text-sm font-bold"
                        style={{ color: p.kind === 'OPENING' ? 'var(--muted-foreground)' : 'var(--foreground)' }}
                      >
                        {formatRupiah(p.totalAmount)}
                      </p>
                      <p className="text-xs" style={mutedText}>
                        {p.items.length} item{p.kind === 'OPENING' && ' · nilai stok'}
                      </p>
                    </div>
                    {expandedId === p.id
                      ? <ChevronUp className="w-4 h-4" style={mutedText} />
                      : <ChevronDown className="w-4 h-4" style={mutedText} />}
                  </div>
                </button>

                {expandedId === p.id && (
                  <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--muted)' }}>
                    {p.notes && (
                      <p className="text-xs py-2" style={mutedText}>📝 {p.notes}</p>
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
                            <p className="text-xs mt-0.5" style={mutedText}>
                              {item.quantity} {item.unitSymbol} × {formatRupiah(item.buyPrice)}
                              {item.expiryDate && ` · Kedaluwarsa ${formatExpiry(item.expiryDate)}`}
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
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={mutedText}>
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchPurchases(page - 1, kindFilter)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ ...mutedField, opacity: page <= 1 ? 0.5 : 1 }}
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() => fetchPurchases(page + 1, kindFilter)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ ...mutedField, opacity: page >= totalPages ? 0.5 : 1 }}
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={handleCloseAttempt}
        >
          <div
            className="w-full sm:max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="min-w-0">
                <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                  {kind === 'OPENING' ? 'Saldo Awal' : 'Catat Pembelian'}
                </h2>
                <p className="text-xs mt-0.5" style={mutedText}>
                  {kind === 'OPENING'
                    ? 'Stok yang sudah ada di toko sebelum sistem dipakai. Tidak dihitung sebagai pengeluaran.'
                    : 'Barang baru dari grosir. Stok bertambah dan modal dihitung rata-rata.'}
                </p>
              </div>
              <button onClick={handleCloseAttempt} className="p-1.5 rounded-lg shrink-0" style={mutedText}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Atas: supplier, catatan, cari produk */}
            <div className="shrink-0 px-4 sm:px-5 py-3 space-y-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className={`grid gap-3 ${kind === 'PURCHASE' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
                {kind === 'PURCHASE' && (
                  <>
                    <div className="space-y-1">
                      <FieldLabel>NAMA SUPPLIER</FieldLabel>
                      <input
                        type="text"
                        placeholder="Opsional"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={mutedField}
                      />
                    </div>
                    <div className="space-y-1">
                      <FieldLabel>NOMOR NOTA</FieldLabel>
                      <input
                        type="text"
                        placeholder="Opsional"
                        value={supplierRef}
                        onChange={(e) => setSupplierRef(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={mutedField}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <FieldLabel>CATATAN</FieldLabel>
                  <input
                    type="text"
                    placeholder="Opsional"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={mutedField}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <FieldLabel>TAMBAH PRODUK</FieldLabel>
                <div className="relative">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={mutedField}>
                    {searching
                      ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={mutedText} />
                      : <Search className="w-4 h-4 shrink-0" style={mutedText} />}
                    <input
                      type="text"
                      placeholder="Cari produk..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="flex-1 bg-transparent text-sm outline-none min-w-0"
                      style={{ color: 'var(--foreground)' }}
                    />
                    {productSearch && (
                      <button onClick={clearSearch}>
                        <X className="w-4 h-4" style={mutedText} />
                      </button>
                    )}
                  </div>

                  {searchResults.length > 0 && (
                    <div
                      className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-30 max-h-56 overflow-y-auto"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                    >
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => addProduct(p)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors gap-3"
                          style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span className="font-medium truncate" style={{ color: 'var(--foreground)' }}>{p.name}</span>
                          <span className="text-xs shrink-0" style={mutedText}>
                            Stok: {p.stock} {p.unitSymbol}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {!searching && productSearch.trim() !== '' && searchResults.length === 0 && !quickAddOpen && (
                    <div
                      className="absolute top-full left-0 right-0 mt-1 rounded-xl p-2.5 z-30 flex items-center justify-between gap-2"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                    >
                      <p className="text-xs truncate" style={mutedText}>
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

            {/* Isi */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-3 space-y-3">
              {quickAddOpen && (
                <div className="rounded-xl p-3 space-y-2.5" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>PRODUK BARU</p>
                    <button onClick={() => setQuickAddOpen(false)}>
                      <X className="w-4 h-4" style={mutedText} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <FieldLabel>NAMA PRODUK *</FieldLabel>
                    <input
                      type="text"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={fieldStyle}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <FieldLabel>KATEGORI</FieldLabel>
                      <select
                        value={quickCategoryId}
                        onChange={(e) => setQuickCategoryId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={fieldStyle}
                      >
                        <option value="">Pilih</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <FieldLabel>SATUAN *</FieldLabel>
                      <select
                        value={quickUnitId}
                        onChange={(e) => setQuickUnitId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={fieldStyle}
                      >
                        <option value="">Pilih</option>
                        {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <FieldLabel>HARGA JUAL *</FieldLabel>
                      <MoneyInput value={quickSell} onChange={setQuickSell} />
                    </div>
                    <div className="space-y-1">
                      <FieldLabel>HARGA BELI *</FieldLabel>
                      <MoneyInput value={quickBuy} onChange={setQuickBuy} />
                    </div>
                  </div>

                  <button
                    onClick={handleQuickAddSave}
                    disabled={quickSaving}
                    className="w-full py-2 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
                  >
                    {quickSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Buat & Tambahkan
                  </button>
                </div>
              )}

              {groups.length > 0 ? (
                <div className="space-y-2">
                  <FieldLabel>DAFTAR PRODUK ({groups.length})</FieldLabel>
                  {groups.map((g) => {
                    const first = g.lines[0]
                    const pv = preview.get(g.productId)!
                    const cc = first.currentCost
                    const sellNow = (newSell[g.productId] ?? 0) > 0 ? newSell[g.productId] : first.sellPrice
                    const profit = pv.costAfter !== null ? sellNow - pv.costAfter : null
                    const pct = profit !== null && sellNow > 0 ? (profit / sellNow) * 100 : null
                    const costDelta =
                      pv.costBefore !== null && pv.costAfter !== null ? pv.costAfter - pv.costBefore : null
                    const priceJump =
                      cc !== null && cc > 0 && first.stock > 0 &&
                      g.lines.some((l) => l.buyPrice > 0 && Math.abs(l.buyPrice - cc) / cc > 0.3)
                    const loss = profit !== null && profit < 0

                    return (
                      <div
                        key={g.productId}
                        className="px-3 py-2.5 rounded-xl space-y-2.5"
                        style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                              {first.productName}
                            </p>
                            <p className="text-[11px] mt-0.5" style={mutedText}>
                              Stok {first.stock} {first.unitSymbol}
                              {cc !== null && ` · Modal ${formatRupiah(Math.round(cc))}`}
                              {` · Jual ${formatRupiah(first.sellPrice)}`}
                            </p>
                          </div>
                          <button onClick={() => removeProduct(g.productId)} className="p-1 rounded-md shrink-0" style={mutedText}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {g.lines.map((line) => (
                          <div key={line.key} className="flex flex-wrap items-end gap-2">
                            <div className="space-y-0.5">
                              <p className="text-[10px]" style={mutedText}>Jumlah</p>
                              <input
                                type="number"
                                min="1"
                                value={line.quantity || ''}
                                onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) || 0 })}
                                className="w-16 px-2 py-1.5 rounded-md text-sm text-center outline-none"
                                style={fieldStyle}
                              />
                            </div>
                            <div className="space-y-0.5 flex-1 min-w-28">
                              <p className="text-[10px]" style={mutedText}>Harga beli / {line.unitSymbol}</p>
                              <MoneyInput value={line.buyPrice} onChange={(n) => updateLine(line.key, { buyPrice: n })} />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[10px]" style={mutedText}>Kedaluwarsa (bulan)</p>
                              <input
                                type="month"
                                value={line.expiry}
                                onChange={(e) => updateLine(line.key, { expiry: e.target.value })}
                                className="px-2 py-1.5 rounded-md text-sm outline-none"
                                style={fieldStyle}
                              />
                            </div>
                            {g.lines.length > 1 && (
                              <button
                                onClick={() => removeLine(line.key)}
                                className="p-1.5 rounded-md"
                                style={mutedText}
                                aria-label="Hapus batch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          onClick={() => addBatch(g.productId)}
                          className="text-xs font-semibold"
                          style={{ color: 'var(--primary)' }}
                        >
                          + Batch lain (kedaluwarsa berbeda)
                        </button>

                        {/* Pratinjau */}
                        <div
                          className="rounded-lg px-2.5 py-2 space-y-1 text-xs"
                          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                        >
                          <p style={mutedText}>
                            Stok: {first.stock} → <b style={{ color: 'var(--foreground)' }}>{pv.stockAfter}</b> {first.unitSymbol}
                          </p>
                          {pv.costAfter !== null && (
                            <p style={mutedText}>
                              {first.stock <= 0 || pv.costBefore === null
                                ? 'Modal ditetapkan: '
                                : `Modal: ${formatRupiah(Math.round(pv.costBefore))} → `}
                              <b style={{ color: 'var(--foreground)' }}>{formatRupiah(Math.round(pv.costAfter))}</b>
                              {costDelta !== null && Math.abs(costDelta) >= 0.5 && first.stock > 0 &&
                                ` (${costDelta > 0 ? '+' : '−'}${formatRupiah(Math.round(Math.abs(costDelta)))})`}
                            </p>
                          )}
                          {profit !== null && pct !== null && (
                            <p style={{ color: loss ? '#ef4444' : 'var(--muted-foreground)' }}>
                              Laba per {first.unitSymbol}: <b>{formatRupiah(Math.round(profit))}</b> ({pct.toFixed(1)}%)
                            </p>
                          )}
                          {loss && (
                            <p className="flex items-center gap-1" style={{ color: '#ef4444' }}>
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              Modal baru lebih tinggi dari harga jual. Periksa harga atau naikkan harga jual.
                            </p>
                          )}
                          {priceJump && (
                            <p className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              Harga beli berbeda lebih dari 30% dari modal saat ini. Pastikan tidak salah ketik.
                            </p>
                          )}
                          {kind === 'OPENING' && first.stock > 0 && (
                            <p className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              Produk ini sudah punya stok {first.stock}. Saldo awal ditambahkan ke stok tersebut, bukan menggantikan.
                            </p>
                          )}
                        </div>

                        {kind === 'PURCHASE' && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px]" style={mutedText}>Harga jual baru (opsional)</span>
                            <div className="w-36">
                              <MoneyInput
                                value={newSell[g.productId] ?? 0}
                                onChange={(n) => setNewSell((prev) => ({ ...prev, [g.productId]: n }))}
                                placeholder={formatNumber(String(first.sellPrice))}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : !quickAddOpen && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--muted)' }}>
                    <Search className="w-4 h-4" style={mutedText} />
                  </div>
                  <p className="text-xs text-center px-4" style={mutedText}>
                    Cari produk di atas untuk mulai mencatat.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-5 py-3 shrink-0 space-y-2.5" style={{ borderTop: '1px solid var(--border)' }}>
              {items.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={mutedText}>
                    {kind === 'OPENING' ? 'Nilai Stok Awal' : 'Total Pembelian'}
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
                  style={mutedField}
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || items.length === 0}
                  className="flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                  style={{
                    background: items.length === 0 ? 'var(--muted)' : 'linear-gradient(135deg, #f97316, #f59e0b)',
                    color: items.length === 0 ? 'var(--muted-foreground)' : '#fff',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {kind === 'OPENING' ? 'Simpan Saldo Awal' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}