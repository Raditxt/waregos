'use client'

import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { ProductDto } from '@waregos/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, Loader2, PackageX, History } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface Category { id: string; name: string }
interface Unit { id: string; name: string; symbol: string }

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
  stock: '0', minStock: '5',
  expiryDate: '', expiryAlertDays: '7',
}

// Helper function untuk format angka dengan titik ribuan
function formatNumber(value: string): string {
  const num = value.replace(/\D/g, '')
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Helper function untuk menghapus titik (parse ke angka murni)
function parseNumber(value: string): string {
  return value.replace(/\./g, '')
}

export default function ProductsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const [products, setProducts] = useState<ProductDto[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProductDto | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // State untuk ConfirmDialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  // State untuk Price History
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false)
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([])
  const [priceHistoryProduct, setPriceHistoryProduct] = useState<string>('')
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fetchProducts = async (q = '') => {
    try {
      const res = await api.get('/products', { params: { search: q, limit: 100 } })
      setProducts(res.data.data)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/catalog/categories'),
      api.get('/catalog/units'),
      api.get('/products', { params: { limit: 100 } }),
    ]).then(([catRes, unitRes, prodRes]) => {
      setCategories(catRes.data.data)
      setUnits(unitRes.data.data)
      setProducts(prodRes.data.data)
    }).catch(() => {
      toast.error('Gagal memuat data')
    }).finally(() => setLoading(false))
  }, [])

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (p: ProductDto) => {
    setEditTarget(p)
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      categoryId: p.categoryId ?? '',
      unitId: p.unitId,
      buyPrice: String(p.buyPrice ?? ''),
      sellPrice: String(p.sellPrice),
      stock: String(p.stock),
      minStock: String(p.minStock),
      expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : '',
      expiryAlertDays: String(p.expiryAlertDays ?? 7),
    })
    setDialogOpen(true)
  }

  const openPriceHistory = async (p: ProductDto) => {
    setPriceHistoryProduct(p.name)
    setPriceHistoryOpen(true)
    setLoadingHistory(true)
    try {
      const res = await api.get(`/products/${p.id}/price-history`)
      setPriceHistory(res.data.data)
    } catch {
      toast.error('Gagal memuat riwayat harga')
    } finally {
      setLoadingHistory(false)
    }
  }

  // Helper function untuk menampilkan confirm dialog
  const showConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, description, onConfirm })
  }

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }))
  }

  const handleDelete = (p: ProductDto) => {
    showConfirm(
      'Hapus Produk',
      `Produk "${p.name}" akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        closeConfirm()
        try {
          await api.delete(`/products/${p.id}`)
          toast.success('Produk berhasil dihapus')
          fetchProducts(search)
        } catch (error) {
          toast.error(getErrorMessage(error))
        }
      }
    )
  }

  const handleSave = async () => {
    if (!form.name || !form.unitId || !form.buyPrice || !form.sellPrice) {
      toast.error('Nama, satuan, harga beli, dan harga jual wajib diisi')
      return
    }

    // 🔥 VALIDASI: Harga jual HARUS lebih tinggi dari harga beli
    if (Number(form.sellPrice) <= Number(form.buyPrice)) {
      toast.error('❌ Harga jual harus lebih tinggi dari harga beli.')
      return
    }

    // Harga tidak boleh 0
    if (Number(form.sellPrice) === 0 || Number(form.buyPrice) === 0) {
      toast.error('Harga tidak boleh 0')
      return
    }

    setSaving(true)
    const payload = {
      name: form.name,
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      categoryId: form.categoryId || undefined,
      unitId: form.unitId,
      buyPrice: Number(form.buyPrice),
      sellPrice: Number(form.sellPrice),
      stock: Number(form.stock),
      minStock: Number(form.minStock),
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
      expiryAlertDays: form.expiryAlertDays ? Number(form.expiryAlertDays) : 7,
    }
    try {
      if (editTarget) {
        await api.patch(`/products/${editTarget.id}`, payload)
        toast.success('Produk berhasil diupdate')
      } else {
        await api.post('/products', payload)
        toast.success('Produk berhasil ditambahkan')
      }
      setDialogOpen(false)
      fetchProducts(search)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produk</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {products.length} produk terdaftar
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Produk
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cari nama, SKU, barcode..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            fetchProducts(e.target.value)
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <PackageX className="w-12 h-12" />
          <p>Belum ada produk</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead className="text-right">Harga Beli</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead>
                <TableHead className="text-center">Stok</TableHead>
                <TableHead className="text-center">Kadaluarsa</TableHead>
                {isAdmin && <TableHead className="text-center">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.barcode && (
                        <p className="text-xs text-muted-foreground">{p.barcode}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.categoryName ? (
                      <Badge variant="secondary">{p.categoryName}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>{p.unitSymbol}</TableCell>
                  <TableCell className="text-right">
                    {p.buyPrice !== null ? formatRupiah(p.buyPrice) : '—'}
                  </TableCell>                  
                  <TableCell className="text-right">{formatRupiah(p.sellPrice)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.stock <= p.minStock ? 'destructive' : 'outline'}>
                      {p.stock} {p.unitSymbol}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.expiryDate ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs">
                          {format(new Date(p.expiryDate), 'd MMM yyyy', { locale: id })}
                        </span>
                        {p.expiryStatus === 'expired' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                            Kadaluarsa
                          </span>
                        )}
                        {p.expiryStatus === 'expiring_soon' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
                            Segera Habis
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openPriceHistory(p)} title="Riwayat harga beli">
                          <History className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(p)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Add/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label>Nama Produk *</Label>
              <Input
                placeholder="Aqua 600ml"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                placeholder="AQ-600"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Barcode</Label>
              <Input
                placeholder="8999999011234"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Satuan *</Label>
              <Select value={form.unitId} onValueChange={(v) => setForm({ ...form, unitId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih satuan" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Harga Beli dengan format titik ribuan */}
            <div className="space-y-2">
              <Label>Harga Beli *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className="pl-9"
                  value={formatNumber(form.buyPrice)}
                  onChange={(e) => setForm({ ...form, buyPrice: parseNumber(e.target.value) })}
                />
              </div>
            </div>

            {/* Harga Jual dengan format titik ribuan */}
            <div className="space-y-2">
              <Label>Harga Jual *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className="pl-9"
                  value={formatNumber(form.sellPrice)}
                  onChange={(e) => setForm({ ...form, sellPrice: parseNumber(e.target.value) })}
                />
              </div>
            </div>

            {/* Margin indicator */}
            {form.buyPrice && form.sellPrice && Number(form.buyPrice) > 0 && (
              <div className={`col-span-2 rounded-lg px-3 py-2 text-sm flex items-center justify-between
                ${Number(form.sellPrice) <= Number(form.buyPrice)
                  ? 'bg-red-50 dark:bg-red-950 text-red-600'
                  : 'bg-green-50 dark:bg-green-950 text-green-700'
                }`}>
                <span>Margin keuntungan:</span>
                <span className="font-bold">
                  {Number(form.buyPrice) > 0
                    ? `${(((Number(form.sellPrice) - Number(form.buyPrice)) / Number(form.buyPrice)) * 100).toFixed(1)}% (${formatRupiah(Number(form.sellPrice) - Number(form.buyPrice))} / item)`
                    : '-'
                  }
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Stok Awal</Label>
              <Input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Stok Minimum</Label>
              <Input
                type="number"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Kadaluarsa</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label>Alert Sebelum Kadaluarsa (hari)</Label>
              <Input
                type="number"
                min="1"
                max="90"
                value={form.expiryAlertDays}
                onChange={(e) => setForm({ ...form, expiryAlertDays: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editTarget ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={priceHistoryOpen} onOpenChange={setPriceHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Riwayat Harga Beli — {priceHistoryProduct}</DialogTitle>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : priceHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Belum ada riwayat perubahan harga
            </div>
          ) : (
            <div className="space-y-3">
              {priceHistory.map((h, i) => (
                <div key={h.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground line-through">
                        {formatRupiah(h.oldPrice)}
                      </span>
                      <span className="text-xs">→</span>
                      <span className="font-medium">{formatRupiah(h.newPrice)}</span>
                      <span className={`text-xs font-medium ${h.newPrice > h.oldPrice ? 'text-red-500' : 'text-green-600'}`}>
                        ({h.newPrice > h.oldPrice ? '+' : ''}{(((h.newPrice - h.oldPrice) / h.oldPrice) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      oleh {h.changedBy} · {format(new Date(h.createdAt), 'd MMM yyyy, HH:mm', { locale: id })}
                    </p>
                  </div>
                  {i === 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      Terbaru
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel="Ya, Hapus"
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  )
}