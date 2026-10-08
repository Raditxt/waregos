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
  Package, ChevronDown, ChevronUp, Tags
} from 'lucide-react'
import { CategoryManager } from './category-manager'

interface Category { id: string; name: string; productCount: number }
interface Unit { id: string; name: string; symbol: string }

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
  expiryStatus: 'ok' | 'expiring_soon' | 'expired' | null
  isActive: boolean
}

interface PriceHistory {
  id: string
  oldPrice: number
  newPrice: number
  changedBy: string
  username: string
  reason: string | null
  createdAt: string
}

const emptyForm = {
  name: '', sku: '', barcode: '',
  categoryId: '', unitId: '',
  buyPrice: '', sellPrice: '',
  stock: '', minStock: '5',
  expiryDate: '', expiryAlertDays: '7',
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

  // Category filter + manager
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)

  // Form
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Price history
  const [historyOpen, setHistoryOpen] = useState(false)
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([])
  const [historyProduct, setHistoryProduct] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Margin warning
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
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (p: ProductDto) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      categoryId: p.categoryId ?? '',
      unitId: p.unitId,
      buyPrice: p.buyPrice !== null ? formatNumber(String(p.buyPrice)) : '',
      sellPrice: formatNumber(String(p.sellPrice)),
      stock: String(p.stock),
      minStock: String(p.minStock),
      expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : '',
      expiryAlertDays: String(p.expiryAlertDays),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.unitId || !form.sellPrice || !form.buyPrice) {
      toast.error('Nama, satuan, harga beli, dan harga jual wajib diisi')
      return
    }
    if (marginWarning) {
      toast.error('Harga jual harus lebih besar dari harga beli')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        categoryId: form.categoryId || undefined,
        unitId: form.unitId,
        buyPrice: Number(parseNumber(form.buyPrice)),
        sellPrice: Number(parseNumber(form.sellPrice)),
        stock: form.stock ? Number(form.stock) : undefined,
        minStock: form.minStock ? Number(form.minStock) : undefined,
        expiryDate: form.expiryDate || undefined,
        expiryAlertDays: form.expiryAlertDays ? Number(form.expiryAlertDays) : undefined,
      }
      if (editingId) {
        await api.patch(`/products/${editingId}`, payload)
        toast.success('Produk berhasil diperbarui')
      } else {
        await api.post('/products', payload)
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
      const res = await api.get(`/products/${p.id}/price-history`)
      setPriceHistory(res.data.data ?? [])
    } catch {
      toast.error('Gagal memuat riwayat harga')
    } finally {
      setLoadingHistory(false)
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

  // Dipanggil CategoryManager setiap kali ada tambah/ubah/hapus
  const refreshCategories = async () => {
    const res = await api.get('/catalog/categories')
    const list: Category[] = res.data.data ?? []
    setCategories(list)

    // Kategori yang sedang dipilih di form / filter bisa saja baru dihapus
    setForm((prev) =>
      !prev.categoryId || list.some((c) => c.id === prev.categoryId)
        ? prev
        : { ...prev, categoryId: '' }
    )
    const filterValid = !categoryFilter || list.some((c) => c.id === categoryFilter)
    if (!filterValid) setCategoryFilter('')

    // Nama kategori di tabel produk ikut berubah kalau ada yang di-rename
    await fetchProducts(1, search, filterValid ? categoryFilter : '')
  }

  const expiryBadge = (status: ProductDto['expiryStatus']) => {
    if (!status || status === 'ok') return null
    return (
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{
          background: status === 'expired' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
          color: status === 'expired' ? '#ef4444' : '#f59e0b',
        }}
      >
        {status === 'expired' ? 'Kadaluarsa' : 'Segera Habis'}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Produk
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
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

      {/* Search + Filter kategori */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
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
              <X className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
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
            style={{ color: 'var(--muted-foreground)' }}
          />
        </div>
      </div>

      {/* Products — Mobile Card + Desktop Table */}
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
              <PackageX className="w-6 h-6" style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Belum ada produk</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                {isAdmin ? 'Mulai dengan menambahkan produk pertama. Klik tombol + Tambah Produk di atas.' : 'Belum ada produk yang terdaftar.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE — Card layout */}
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
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{p.unitSymbol}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openHistory(p)} className="p-1.5 rounded-lg" style={{ color: 'var(--muted-foreground)' }}>
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg" style={{ color: 'var(--muted-foreground)' }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--muted-foreground)' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Jual</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{formatRupiah(p.sellPrice)}</p>
                      </div>
                      {isAdmin && p.buyPrice !== null && (
                        <div>
                          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Beli</p>
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{formatRupiah(p.buyPrice)}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Stok</p>
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
                  {(p.expiryDate || p.expiryStatus) && p.expiryStatus !== 'ok' && (
                    <div className="flex items-center gap-2">
                      {p.expiryDate && (
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          Exp: {format(new Date(p.expiryDate), 'd MMM yyyy', { locale: id })}
                        </p>
                      )}
                      {expiryBadge(p.expiryStatus)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* DESKTOP — Table layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Produk', 'Kategori', 'Satuan', isAdmin ? 'Harga Beli' : null, 'Harga Jual', 'Stok', 'Kadaluarsa', isAdmin ? 'Aksi' : null]
                      .filter(Boolean)
                      .map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
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
                          {p.sku && <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted-foreground)' }}>{p.sku}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.categoryName ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                            {p.categoryName}
                          </span>
                        ) : <span style={{ color: 'var(--muted-foreground)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>{p.unitSymbol}</td>
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
                        <div className="flex flex-col gap-1">
                          {p.expiryDate && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{format(new Date(p.expiryDate), 'd MMM yyyy', { locale: id })}</p>}
                          {expiryBadge(p.expiryStatus)}
                          {!p.expiryDate && <span style={{ color: 'var(--muted-foreground)' }}>—</span>}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openHistory(p)} className="p-1.5 rounded-lg transition-all" title="Riwayat harga" style={{ color: 'var(--muted-foreground)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,115,22,0.1)'; e.currentTarget.style.color = 'var(--primary)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}>
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg transition-all" title="Edit produk" style={{ color: 'var(--muted-foreground)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.color = '#3b82f6' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)' }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg transition-all" title="Hapus produk" style={{ color: 'var(--muted-foreground)' }}
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

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
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

      {/* Add/Edit Dialog */}
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
            {/* Dialog header */}
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
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dialog body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Nama */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                  NAMA PRODUK *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Aqua 600ml"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                  }}
                />
              </div>

              {/* Kategori + Satuan */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                      KATEGORI
                    </label>
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
                      style={{
                        background: 'var(--muted)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)',
                      }}
                    >
                      <option value="">Pilih kategori</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown
                      className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--muted-foreground)' }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    SATUAN *
                  </label>
                  <select
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <option value="">Pilih satuan</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Harga Beli + Jual */}
              <div className="grid grid-cols-2 gap-3">
                {isAdmin && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                      HARGA BELI *
                    </label>
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Rp</span>
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    HARGA JUAL *
                  </label>
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{
                      background: 'var(--muted)',
                      border: `1px solid ${marginWarning ? 'var(--error)' : 'var(--border)'}`,
                    }}
                  >
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Rp</span>
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
                      Harga jual harus lebih dari harga beli
                    </div>
                  )}
                </div>
              </div>

              {/* Stok + Min Stok */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    STOK AWAL
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
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
                    MIN STOK ALERT
                  </label>
                  <input
                    type="number"
                    placeholder="5"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
              </div>

              {/* SKU + Barcode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    SKU
                  </label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
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
                    BARCODE
                  </label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
              </div>

              {/* Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    TANGGAL KADALUARSA
                  </label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
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
                    ALERT SEBELUM (HARI)
                  </label>
                  <input
                    type="number"
                    value={form.expiryAlertDays}
                    onChange={(e) => setForm({ ...form, expiryAlertDays: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Dialog footer */}
            <div
              className="flex gap-3 px-6 py-4 shrink-0"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setDialogOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
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

      {/* Delete Confirm Dialog */}
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
            <p className="text-sm text-center mb-6" style={{ color: 'var(--muted-foreground)' }}>
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

      {/* Price History Dialog */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden max-h-[80vh] flex flex-col"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
                  Riwayat Harga Beli
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {historyProduct}
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

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
              ) : priceHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--muted-foreground)' }} />
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    Belum ada riwayat perubahan harga
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {priceHistory.map((h, i) => {
                    const isUp = h.newPrice > h.oldPrice
                    const pct = (((h.newPrice - h.oldPrice) / h.oldPrice) * 100).toFixed(1)
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between py-3 px-4 rounded-xl"
                        style={{ background: 'var(--muted)' }}
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="line-through" style={{ color: 'var(--muted-foreground)' }}>
                              {formatRupiah(h.oldPrice)}
                            </span>
                            <span style={{ color: 'var(--muted-foreground)' }}>→</span>
                            <span className="font-bold" style={{ color: 'var(--foreground)' }}>
                              {formatRupiah(h.newPrice)}
                            </span>
                            <span
                              className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                              style={{
                                background: isUp ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                color: isUp ? '#ef4444' : '#22c55e',
                              }}
                            >
                              {isUp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {Math.abs(Number(pct))}%
                            </span>
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                            oleh {h.changedBy} · {format(new Date(h.createdAt), 'd MMM yyyy, HH:mm', { locale: id })}
                          </p>
                        </div>
                        {i === 0 && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                          >
                            Terbaru
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Manager */}
      <CategoryManager
        open={categoryManagerOpen}
        categories={categories}
        onClose={() => setCategoryManagerOpen(false)}
        onChanged={refreshCategories}
      />
    </div>
  )
}