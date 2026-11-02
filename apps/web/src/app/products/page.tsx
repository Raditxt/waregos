'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { formatRupiah, formatNumber, parseNumber } from '@/lib/format'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  Plus, Search, Pencil, Trash2, Loader2,
  PackageX, History, X, AlertTriangle,
  Package, ChevronDown, ChevronUp, Tags, Boxes, Coins
} from 'lucide-react'
import { CategoryManager } from './category-manager'

type ExpiryStatus = 'ok' | 'expiring_soon' | 'expired'
type AdjustReason = 'EXPIRED' | 'DAMAGED' | 'LOST' | 'CORRECTION'

interface Category { id: string; name: string; productCount: number }
interface Unit { id: string; name: string; symbol: string }

interface ExpiryLayer {
  expiryDate: string | null
  quantity: number
  status: ExpiryStatus | null
  daysLeft: number | null
}

interface ProductDto {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  categoryId: string | null
  categoryName: string | null
  unitId: string
  unitName: string
  unitSymbol: string
  buyPrice: number | null
  sellPrice: number
  stock: number
  minStock: number
  expiryDate: string | null
  expiryAlertDays: number
  expiryStatus: ExpiryStatus | null
  expiryLayers: ExpiryLayer[]
  expiredQuantity: number
  expiringSoonQuantity: number
  untrackedQuantity: number
  isActive: boolean
}

interface CostCorrection {
  id: string
  oldPrice: number
  newPrice: number
  changedBy: string
  username: string
  reason: string | null
  createdAt: string
}

interface PurchaseLine {
  id: string
  invoiceNumber: string
  kind: 'PURCHASE' | 'OPENING'
  purchasedAt: string
  supplierName: string | null
  supplierRef: string | null
  quantity: number
  buyPrice: number
  expiryDate: string | null
}

const emptyForm = {
  name: '', sku: '', barcode: '',
  categoryId: '', unitId: '',
  buyPrice: '', sellPrice: '',
  minStock: '5', expiryAlertDays: '7',
}

const REASON_LABEL: Record<AdjustReason, string> = {
  EXPIRED: 'Kedaluwarsa',
  DAMAGED: 'Rusak',
  LOST: 'Hilang',
  CORRECTION: 'Koreksi hitung',
}

const mutedText = { color: 'var(--muted-foreground)' }
const fieldStyle = {
  background: 'var(--muted)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}

const formatDay = (date: string) =>
  format(new Date(`${date}T00:00:00`), 'd MMM yyyy', { locale: id })

const statusStyle = (s: ExpiryStatus | null) =>
  s === 'expired'
    ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }
    : s === 'expiring_soon'
      ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
      : { background: 'var(--muted)', color: 'var(--muted-foreground)' }

function ExpiryInfo({
  p, canWriteOff, onWriteOff,
}: {
  p: ProductDto
  canWriteOff: boolean
  onWriteOff: (p: ProductDto) => void
}) {
  const dated = p.expiryLayers.filter((l) => l.expiryDate !== null)
  const shown = dated.slice(0, 3)
  const hidden = dated.length - shown.length
  const undated =
    p.expiryLayers.filter((l) => l.expiryDate === null).reduce((s, l) => s + l.quantity, 0) +
    p.untrackedQuantity

  if (dated.length === 0 && !p.expiryDate && undated === 0) {
    return <span style={mutedText}>—</span>
  }

  return (
    <div className="flex flex-col gap-1 items-start">
      {shown.map((l) => (
        <div key={l.expiryDate} className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={statusStyle(l.status)}
          >
            {l.quantity} {p.unitSymbol} · {formatDay(l.expiryDate as string)}
          </span>
          {l.status === 'expired' && canWriteOff && (
            <button
              onClick={() => onWriteOff(p)}
              className="text-xs font-semibold"
              style={{ color: '#ef4444' }}
            >
              Buang
            </button>
          )}
        </div>
      ))}
      {hidden > 0 && (
        <span className="text-xs" style={mutedText}>+{hidden} tanggal lain</span>
      )}
      {dated.length === 0 && p.expiryDate && (
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={statusStyle(p.expiryStatus)}
        >
          {format(new Date(p.expiryDate), 'd MMM yyyy', { locale: id })}
        </span>
      )}
      {undated > 0 && (
        <span className="text-xs" style={mutedText}>
          {undated} {p.unitSymbol} tanpa tanggal
        </span>
      )}
    </div>
  )
}

export default function ProductsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const [products, setProducts] = useState<ProductDto[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 20

  const [categoryFilter, setCategoryFilter] = useState('')
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [costHistory, setCostHistory] = useState<CostCorrection[]>([])
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([])
  const [historyProduct, setHistoryProduct] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [adjustProduct, setAdjustProduct] = useState<ProductDto | null>(null)
  const [adjDirection, setAdjDirection] = useState<'OUT' | 'IN'>('OUT')
  const [adjReason, setAdjReason] = useState<AdjustReason>('EXPIRED')
  const [adjQty, setAdjQty] = useState('')
  const [adjNotes, setAdjNotes] = useState('')
  const [adjSaving, setAdjSaving] = useState(false)

  const [costProduct, setCostProduct] = useState<ProductDto | null>(null)
  const [costValue, setCostValue] = useState('')
  const [costReason, setCostReason] = useState('')
  const [costSaving, setCostSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const marginWarning = form.buyPrice && form.sellPrice &&
    Number(parseNumber(form.sellPrice)) <= Number(parseNumber(form.buyPrice))

  const fetchProducts = useCallback(async (p = 1, q = search, cat = categoryFilter) => {
    setLoading(true)
    try {
      const res = await api.get('/products', {
        params: { page: p, limit, ...(q && { search: q }), ...(cat && { categoryId: cat }) }
      })
      setProducts(res.data.data ?? [])
      setTotal(res.data.meta?.total ?? 0)
      setPage(p)
    } catch {
      toast.error('Gagal memuat produk')
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => {
    const init = async () => {
      await fetchProducts()
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

  const openAdd = () => {
    setEditingId(null)
    setEditingProduct(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (p: ProductDto) => {
    setEditingId(p.id)
    setEditingProduct(p)
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      categoryId: p.categoryId ?? '',
      unitId: p.unitId,
      buyPrice: p.buyPrice !== null ? formatNumber(String(Math.round(p.buyPrice))) : '',
      sellPrice: formatNumber(String(p.sellPrice)),
      minStock: String(p.minStock),
      expiryAlertDays: String(p.expiryAlertDays),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.unitId || !form.sellPrice || (!editingId && !form.buyPrice)) {
      toast.error(
        editingId
          ? 'Nama, satuan, dan harga jual wajib diisi'
          : 'Nama, satuan, harga beli, dan harga jual wajib diisi'
      )
      return
    }
    if (marginWarning) {
      toast.error('Harga jual harus lebih besar dari harga beli')
      return
    }
    setSaving(true)
    try {
      const base = {
        name: form.name,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        categoryId: form.categoryId || undefined,
        unitId: form.unitId,
        sellPrice: Number(parseNumber(form.sellPrice)),
        minStock: form.minStock ? Number(form.minStock) : undefined,
        expiryAlertDays: form.expiryAlertDays ? Number(form.expiryAlertDays) : undefined,
      }
      if (editingId) {
        await api.patch(`/products/${editingId}`, base)
        toast.success('Produk berhasil diperbarui')
      } else {
        await api.post('/products', { ...base, buyPrice: Number(parseNumber(form.buyPrice)) })
        toast.success('Produk berhasil ditambahkan')
      }
      setDialogOpen(false)
      fetchProducts(1)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/products/${deleteId}`)
      toast.success('Produk berhasil dihapus')
      setDeleteId(null)
      fetchProducts(1)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const openHistory = async (p: ProductDto) => {
    setHistoryProduct(p.name)
    setHistoryOpen(true)
    setLoadingHistory(true)
    try {
      const [costRes, purchaseRes] = await Promise.all([
        api.get(`/products/${p.id}/price-history`),
        api.get(`/products/${p.id}/purchase-history`),
      ])
      setCostHistory(costRes.data.data ?? [])
      setPurchaseLines(purchaseRes.data.data ?? [])
    } catch {
      toast.error('Gagal memuat riwayat modal')
    } finally {
      setLoadingHistory(false)
    }
  }

  const openAdjust = (p: ProductDto) => {
    setAdjustProduct(p)
    setAdjDirection('OUT')
    setAdjReason('EXPIRED')
    setAdjQty('')
    setAdjNotes('')
  }

  const openWriteOff = (p: ProductDto) => {
    openAdjust(p)
    if (p.expiredQuantity > 0) setAdjQty(String(p.expiredQuantity))
  }

  const changeDirection = (d: 'OUT' | 'IN') => {
    setAdjDirection(d)
    setAdjReason(d === 'IN' ? 'CORRECTION' : 'EXPIRED')
  }

  const adjQtyNum = adjQty === '' ? 0 : Number(adjQty)
  const adjQtyValid = Number.isInteger(adjQtyNum) && adjQtyNum > 0
  const adjNotesRequired = adjReason === 'LOST' || adjReason === 'CORRECTION'
  const adjTooMuch =
    adjustProduct !== null && adjDirection === 'OUT' && adjQtyNum > adjustProduct.stock
  const adjStockAfter = adjustProduct
    ? adjustProduct.stock + (adjDirection === 'IN' ? adjQtyNum : -adjQtyNum)
    : 0
  const adjValue =
    adjustProduct && adjDirection === 'OUT' && adjustProduct.buyPrice !== null && adjQtyValid
      ? adjustProduct.buyPrice * adjQtyNum
      : null

  const handleAdjust = async () => {
    if (!adjustProduct) return
    if (!adjQtyValid) {
      toast.error('Jumlah harus bilangan bulat lebih dari 0')
      return
    }
    if (adjTooMuch) {
      toast.error(`Stok hanya ${adjustProduct.stock}`)
      return
    }
    if (adjNotesRequired && adjNotes.trim().length < 3) {
      toast.error('Catatan wajib diisi (minimal 3 karakter)')
      return
    }
    setAdjSaving(true)
    try {
      const res = await api.post('/stock/adjustments', {
        productId: adjustProduct.id,
        direction: adjDirection,
        quantity: adjQtyNum,
        reason: adjReason,
        ...(adjNotes.trim() ? { notes: adjNotes.trim() } : {}),
      })
      const value = res.data.data?.totalValue
      toast.success(
        adjDirection === 'OUT' && typeof value === 'number'
          ? `Stok dikurangi. Nilai ${formatRupiah(value)}`
          : 'Stok diperbarui'
      )
      setAdjustProduct(null)
      setDialogOpen(false)
      fetchProducts(page)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setAdjSaving(false)
    }
  }

  const openCost = (p: ProductDto) => {
    setCostProduct(p)
    setCostValue('')
    setCostReason('')
  }

  const costNum = Number(parseNumber(costValue)) || 0

  const handleCost = async () => {
    if (!costProduct) return
    if (costNum <= 0) {
      toast.error('Modal baru harus lebih dari 0')
      return
    }
    if (costReason.trim().length < 3) {
      toast.error('Alasan koreksi wajib diisi (minimal 3 karakter)')
      return
    }
    setCostSaving(true)
    try {
      await api.post('/stock/cost-corrections', {
        productId: costProduct.id,
        newCost: costNum,
        reason: costReason.trim(),
      })
      toast.success('Modal berhasil dikoreksi')
      setCostProduct(null)
      setDialogOpen(false)
      fetchProducts(page)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setCostSaving(false)
    }
  }

  const handleSearch = (q: string) => {
    setSearch(q)
    fetchProducts(1, q)
  }

  const handleCategoryFilter = (id: string) => {
    setCategoryFilter(id)
    fetchProducts(1, search, id)
  }

  const refreshCategories = async () => {
    const res = await api.get('/catalog/categories')
    const list: Category[] = res.data.data ?? []
    setCategories(list)

    setForm((prev) =>
      !prev.categoryId || list.some((c) => c.id === prev.categoryId)
        ? prev
        : { ...prev, categoryId: '' }
    )
    const filterValid = !categoryFilter || list.some((c) => c.id === categoryFilter)
    if (!filterValid) setCategoryFilter('')

    await fetchProducts(1, search, filterValid ? categoryFilter : '')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Produk
          </h1>
          <p className="text-sm mt-0.5" style={mutedText}>
            {total} produk terdaftar
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCategoryManagerOpen(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--muted)'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
            >
              <Tags className="w-4 h-4" />
              Kategori
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Plus className="w-4 h-4" />
              Tambah Produk
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <Search className="w-4 h-4 shrink-0" style={mutedText} />
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--foreground)' }}
          />
          {search && (
            <button onClick={() => handleSearch('')}>
              <X className="w-4 h-4" style={mutedText} />
            </button>
          )}
        </div>

        <div className="relative sm:w-56">
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryFilter(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 pr-10 rounded-xl text-sm outline-none"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown
            className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={mutedText}
          />
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--muted)' }}>
              <PackageX className="w-6 h-6" style={mutedText} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Belum ada produk</p>
              <p className="text-xs mt-1" style={mutedText}>
                {isAdmin ? 'Mulai dengan menambahkan produk pertama. Klik tombol + Tambah Produk di atas.' : 'Belum ada produk yang terdaftar.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="block md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {products.map((p) => (
                <div key={p.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {p.categoryName && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                            {p.categoryName}
                          </span>
                        )}
                        <span className="text-xs" style={mutedText}>{p.unitSymbol}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openHistory(p)} className="p-1.5 rounded-lg" style={mutedText} aria-label="Riwayat modal">
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openAdjust(p)} className="p-1.5 rounded-lg" style={mutedText} aria-label="Koreksi stok">
                          <Boxes className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg" style={mutedText} aria-label="Edit produk">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg" style={mutedText} aria-label="Hapus produk">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs" style={mutedText}>Jual</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{formatRupiah(p.sellPrice)}</p>
                      </div>
                      {isAdmin && p.buyPrice !== null && (
                        <div>
                          <p className="text-xs" style={mutedText}>Modal</p>
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{formatRupiah(p.buyPrice)}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={mutedText}>Stok</p>
                      <span
                        className="text-sm font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: p.stock <= p.minStock ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.1)',
                          color: p.stock <= p.minStock ? '#ef4444' : '#22c55e',
                        }}
                      >
                        {p.stock} {p.unitSymbol}
                      </span>
                    </div>
                  </div>
                  {(p.expiryLayers.length > 0 || p.expiryDate) && (
                    <ExpiryInfo p={p} canWriteOff={isAdmin} onWriteOff={openWriteOff} />
                  )}
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Produk', 'Kategori', 'Satuan', isAdmin ? 'Modal' : null, 'Harga Jual', 'Stok', 'Kedaluwarsa', isAdmin ? 'Aksi' : null]
                      .filter(Boolean)
                      .map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={mutedText}>
                          {h}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium" style={{ color: 'var(--foreground)' }}>{p.name}</p>
                          {p.sku && <p className="text-xs mt-0.5 font-mono" style={mutedText}>{p.sku}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.categoryName ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                            {p.categoryName}
                          </span>
                        ) : <span style={mutedText}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm" style={mutedText}>{p.unitSymbol}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--foreground)' }}>
                          {p.buyPrice !== null ? formatRupiah(p.buyPrice) : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-bold" style={{ color: 'var(--primary)' }}>
                        {formatRupiah(p.sellPrice)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: p.stock <= p.minStock ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.1)',
                            color: p.stock <= p.minStock ? '#ef4444' : '#22c55e',
                          }}
                        >
                          {p.stock} {p.unitSymbol}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ExpiryInfo p={p} canWriteOff={isAdmin} onWriteOff={openWriteOff} />
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openHistory(p)} className="p-1.5 rounded-lg transition-all" title="Riwayat modal" style={mutedText}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.1)'; e.currentTarget.style.color = 'var(--primary)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}>
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openAdjust(p)} className="p-1.5 rounded-lg transition-all" title="Koreksi stok (buang, rusak, hilang)" style={mutedText}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; e.currentTarget.style.color = '#f59e0b' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}>
                              <Boxes className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg transition-all" title="Edit produk" style={mutedText}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.color = '#3b82f6' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg transition-all" title="Hapus produk" style={mutedText}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--error-light)'; e.currentTarget.style.color = 'var(--error)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={mutedText}>
              Halaman {page} dari {Math.ceil(total / limit)} · {total} produk
            </p>
            <div className="flex gap-2">
              <button onClick={() => fetchProducts(page - 1)} disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', opacity: page <= 1 ? 0.5 : 1 }}>
                ← Sebelumnya
              </button>
              <button onClick={() => fetchProducts(page + 1)} disabled={page >= Math.ceil(total / limit)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', opacity: page >= Math.ceil(total / limit) ? 0.5 : 1 }}>
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                {editingId ? 'Edit Produk' : 'Tambah Produk'}
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={mutedText}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={mutedText}>NAMA PRODUK *</label>
                <input
                  type="text"
                  placeholder="Contoh: Aqua 600ml"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={fieldStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold" style={mutedText}>KATEGORI</label>
                    <button
                      type="button"
                      onClick={() => setCategoryManagerOpen(true)}
                      className="text-xs font-semibold"
                      style={{ color: 'var(--primary)' }}
                    >
                      + Kelola
                    </button>
                  </div>
                  <div className="relative">
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full appearance-none px-3 py-2.5 pr-10 rounded-xl text-sm outline-none"
                      style={fieldStyle}
                    >
                      <option value="">Pilih kategori</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown
                      className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={mutedText}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={mutedText}>SATUAN *</label>
                  <select
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={fieldStyle}
                  >
                    <option value="">Pilih satuan</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!editingId && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold" style={mutedText}>HARGA BELI *</label>
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-xs" style={mutedText}>Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={form.buyPrice}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          setForm({ ...form, buyPrice: raw ? formatNumber(raw) : '' })
                        }}
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: 'var(--foreground)' }}
                      />
                    </div>
                  </div>
                )}
                <div className={`space-y-1.5 ${editingId ? 'col-span-2' : ''}`}>
                  <label className="text-xs font-semibold" style={mutedText}>HARGA JUAL *</label>
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{
                      background: 'var(--muted)',
                      border: `1px solid ${marginWarning ? 'var(--error)' : 'var(--border)'}`,
                    }}
                  >
                    <span className="text-xs" style={mutedText}>Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={form.sellPrice}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '')
                        setForm({ ...form, sellPrice: raw ? formatNumber(raw) : '' })
                      }}
                      className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: 'var(--foreground)' }}
                    />
                  </div>
                  {marginWarning && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--error)' }}>
                      <AlertTriangle className="w-3 h-3" />
                      Harga jual harus lebih dari {editingId ? 'modal saat ini' : 'harga beli'}
                    </div>
                  )}
                </div>
              </div>

              {editingProduct ? (
                <div
                  className="rounded-xl p-3 space-y-3"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold" style={mutedText}>STOK SAAT INI</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                        {editingProduct.stock} {editingProduct.unitSymbol}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAdjust(editingProduct)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      Koreksi stok
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold" style={mutedText}>MODAL RATA-RATA</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                        {editingProduct.buyPrice !== null ? formatRupiah(editingProduct.buyPrice) : 'Belum ada'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCost(editingProduct)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      Koreksi modal
                    </button>
                  </div>
                  <p className="text-[11px]" style={mutedText}>
                    Stok bertambah lewat menu Pembelian dan modal dihitung otomatis dari pembelian.
                    Dua tombol di atas untuk perbaikan, dan keduanya tercatat di audit.
                  </p>
                </div>
              ) : (
                <p className="text-xs" style={mutedText}>
                  Stok dan tanggal kedaluwarsa diisi lewat menu Pembelian: Saldo Awal untuk barang
                  yang sudah ada di toko, Catat Pembelian untuk barang baru. Harga beli di sini
                  hanya modal awal, dan akan dihitung ulang saat stok pertama masuk.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={mutedText}>MIN STOK ALERT</label>
                  <input
                    type="number"
                    placeholder="5"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={fieldStyle}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={mutedText}>ALERT KEDALUWARSA (HARI)</label>
                  <input
                    type="number"
                    value={form.expiryAlertDays}
                    onChange={(e) => setForm({ ...form, expiryAlertDays: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={fieldStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={mutedText}>SKU</label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={fieldStyle}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={mutedText}>BARCODE</label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={fieldStyle}
                  />
                </div>
              </div>
            </div>

            <div
              className="flex gap-3 px-6 py-4 shrink-0"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setDialogOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !!marginWarning}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                style={{
                  background: saving || marginWarning
                    ? 'var(--muted)'
                    : 'linear-gradient(135deg, #f97316, #f59e0b)',
                  color: saving || marginWarning ? 'var(--muted-foreground)' : '#fff',
                }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'Simpan Perubahan' : 'Tambah Produk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustProduct && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setAdjustProduct(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-start justify-between gap-3 px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="min-w-0">
                <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Koreksi Stok</h2>
                <p className="text-xs mt-0.5 truncate" style={mutedText}>
                  {adjustProduct.name} · stok {adjustProduct.stock} {adjustProduct.unitSymbol}
                </p>
              </div>
              <button onClick={() => setAdjustProduct(null)} className="p-1.5 rounded-lg shrink-0" style={mutedText}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {([['OUT', 'Kurangi stok'], ['IN', 'Tambah stok']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => changeDirection(value)}
                    className="py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: adjDirection === value ? 'var(--primary-light)' : 'var(--muted)',
                      color: adjDirection === value ? 'var(--primary)' : 'var(--muted-foreground)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={mutedText}>ALASAN *</label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value as AdjustReason)}
                  disabled={adjDirection === 'IN'}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={fieldStyle}
                >
                  {(adjDirection === 'IN'
                    ? (['CORRECTION'] as AdjustReason[])
                    : (['EXPIRED', 'DAMAGED', 'LOST', 'CORRECTION'] as AdjustReason[])
                  ).map((r) => (
                    <option key={r} value={r}>{REASON_LABEL[r]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={mutedText}>JUMLAH ({adjustProduct.unitSymbol}) *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="0"
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={fieldStyle}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={mutedText}>
                  CATATAN {adjNotesRequired ? '*' : '(opsional)'}
                </label>
                <input
                  type="text"
                  placeholder={adjNotesRequired ? 'Wajib untuk hilang atau koreksi hitung' : 'Opsional'}
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={fieldStyle}
                />
              </div>

              {adjQtyValid && (
                <div className="rounded-xl px-3 py-2.5 space-y-1 text-xs" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                  <p style={mutedText}>
                    Stok: {adjustProduct.stock} → <b style={{ color: 'var(--foreground)' }}>{adjStockAfter}</b> {adjustProduct.unitSymbol}
                  </p>
                  {adjValue !== null && (
                    <p style={mutedText}>
                      {adjReason === 'CORRECTION' ? 'Nilai koreksi' : 'Nilai kerugian'}:{' '}
                      <b style={{ color: 'var(--foreground)' }}>{formatRupiah(Math.round(adjValue))}</b>{' '}
                      (modal {formatRupiah(Math.round(adjustProduct.buyPrice ?? 0))} per {adjustProduct.unitSymbol})
                    </p>
                  )}
                  {adjTooMuch && (
                    <p className="flex items-center gap-1" style={{ color: '#ef4444' }}>
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Jumlah melebihi stok yang ada.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setAdjustProduct(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                Batal
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjSaving || !adjQtyValid || adjTooMuch}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{
                  background: adjSaving || !adjQtyValid || adjTooMuch ? 'var(--muted)' : 'linear-gradient(135deg, #f97316, #f59e0b)',
                  color: adjSaving || !adjQtyValid || adjTooMuch ? 'var(--muted-foreground)' : '#fff',
                }}
              >
                {adjSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {costProduct && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setCostProduct(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-start justify-between gap-3 px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="min-w-0">
                <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Koreksi Modal</h2>
                <p className="text-xs mt-0.5 truncate" style={mutedText}>
                  {costProduct.name} · modal sekarang{' '}
                  {costProduct.buyPrice !== null ? formatRupiah(costProduct.buyPrice) : 'belum ada'}
                </p>
              </div>
              <button onClick={() => setCostProduct(null)} className="p-1.5 rounded-lg shrink-0" style={mutedText}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={mutedText}>MODAL BARU PER {costProduct.unitSymbol.toUpperCase()} *</label>
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  <span className="text-xs" style={mutedText}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={costValue}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setCostValue(raw ? formatNumber(raw) : '')
                    }}
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--foreground)' }}
                  />
                </div>
                {costNum >= costProduct.sellPrice && costNum > 0 && (
                  <p className="flex items-center gap-1 text-xs" style={{ color: '#ef4444' }}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Modal ini tidak lebih rendah dari harga jual ({formatRupiah(costProduct.sellPrice)}).
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={mutedText}>ALASAN *</label>
                <input
                  type="text"
                  placeholder="Contoh: salah hitung isi dus"
                  value={costReason}
                  onChange={(e) => setCostReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={fieldStyle}
                />
              </div>

              <p className="text-xs" style={mutedText}>
                Koreksi hanya berlaku ke depan. Transaksi yang sudah terjadi tetap memakai modal saat itu.
              </p>
            </div>

            <div className="flex gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setCostProduct(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                Batal
              </button>
              <button
                onClick={handleCost}
                disabled={costSaving || costNum <= 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{
                  background: costSaving || costNum <= 0 ? 'var(--muted)' : 'linear-gradient(135deg, #f97316, #f59e0b)',
                  color: costSaving || costNum <= 0 ? 'var(--muted-foreground)' : '#fff',
                }}
              >
                {costSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setDeleteId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--error-light)' }}
            >
              <Trash2 className="w-5 h-5" style={{ color: 'var(--error)' }} />
            </div>
            <h3 className="text-base font-bold text-center mb-2" style={{ color: 'var(--foreground)' }}>
              Hapus Produk?
            </h3>
            <p className="text-sm text-center mb-6" style={mutedText}>
              Produk akan dinonaktifkan dan tidak muncul di kasir. Riwayat transaksi tetap tersimpan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'var(--error)' }}
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                  Riwayat Modal
                </h2>
                <p className="text-xs mt-0.5" style={mutedText}>{historyProduct}</p>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="p-1.5 rounded-lg" style={mutedText}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
              ) : (
                <>
                  <section>
                    <p className="text-xs font-semibold mb-2" style={mutedText}>PEMBELIAN TERAKHIR</p>
                    {purchaseLines.length === 0 ? (
                      <div className="text-center py-4">
                        <Package className="w-7 h-7 mx-auto mb-1.5" style={mutedText} />
                        <p className="text-sm" style={mutedText}>Belum ada pembelian tercatat</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {purchaseLines.map((l) => (
                          <div key={l.id} className="py-2.5 px-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                            <p className="text-sm font-medium flex items-center gap-2 flex-wrap" style={{ color: 'var(--foreground)' }}>
                              {l.quantity} × {formatRupiah(l.buyPrice)}
                              {l.kind === 'OPENING' && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                  style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                                >
                                  SALDO AWAL
                                </span>
                              )}
                            </p>
                            <p className="text-xs mt-0.5" style={mutedText}>
                              {format(new Date(l.purchasedAt), 'd MMM yyyy', { locale: id })}
                              {l.supplierName && ` · ${l.supplierName}`}
                              {l.supplierRef && ` · Nota ${l.supplierRef}`}
                              {l.expiryDate && ` · Exp ${formatDay(l.expiryDate)}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <p className="text-xs font-semibold mb-2" style={mutedText}>KOREKSI MODAL MANUAL</p>
                    {costHistory.length === 0 ? (
                      <p className="text-sm" style={mutedText}>Belum ada koreksi</p>
                    ) : (
                      <div className="space-y-2">
                        {costHistory.map((h) => {
                          const isUp = h.newPrice > h.oldPrice
                          const pct = h.oldPrice > 0
                            ? Math.abs(((h.newPrice - h.oldPrice) / h.oldPrice) * 100).toFixed(1)
                            : '—'
                          return (
                            <div key={h.id} className="py-2.5 px-3 rounded-xl" style={{ background: 'var(--muted)' }}>
                              <div className="flex items-center gap-2 text-sm flex-wrap">
                                <span className="line-through" style={mutedText}>{formatRupiah(h.oldPrice)}</span>
                                <span style={mutedText}>→</span>
                                <span className="font-bold" style={{ color: 'var(--foreground)' }}>{formatRupiah(h.newPrice)}</span>
                                <span
                                  className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                                  style={{
                                    background: isUp ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                    color: isUp ? '#ef4444' : '#22c55e',
                                  }}
                                >
                                  {isUp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  {pct}%
                                </span>
                              </div>
                              <p className="text-xs mt-1" style={mutedText}>
                                {h.reason && `${h.reason} · `}
                                oleh {h.changedBy} · {format(new Date(h.createdAt), 'd MMM yyyy, HH:mm', { locale: id })}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <CategoryManager
        open={categoryManagerOpen}
        categories={categories}
        onClose={() => setCategoryManagerOpen(false)}
        onChanged={refreshCategories}
      />
    </div>
  )
}