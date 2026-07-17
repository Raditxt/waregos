'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
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
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, Loader2, PackageX } from 'lucide-react'
import { AxiosError } from 'axios'

interface Category { id: string; name: string }
interface Unit { id: string; name: string; symbol: string }

const emptyForm = {
  name: '', sku: '', barcode: '',
  categoryId: '', unitId: '',
  buyPrice: '', sellPrice: '',
  stock: '0', minStock: '5',
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

  const fetchProducts = async (q = '') => {
    try {
      const res = await api.get('/products', { params: { search: q, limit: 100 } })
      setProducts(res.data.data)
    } catch {
      toast.error('Gagal memuat produk')
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
      buyPrice: String(p.buyPrice),
      sellPrice: String(p.sellPrice),
      stock: String(p.stock),
      minStock: String(p.minStock),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.unitId || !form.buyPrice || !form.sellPrice) {
      toast.error('Nama, satuan, harga beli, dan harga jual wajib diisi')
      return
    }

    // 🔥 VALIDASI BARU: Harga jual HARUS lebih tinggi dari harga beli
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
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message ?? 'Gagal menyimpan produk')
      } else {
        toast.error('Gagal menyimpan produk')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p: ProductDto) => {
    if (!confirm(`Hapus produk "${p.name}"?`)) return
    try {
      await api.delete(`/products/${p.id}`)
      toast.success('Produk dihapus')
      fetchProducts(search)
    } catch {
      toast.error('Gagal menghapus produk')
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
                  <TableCell className="text-right">{formatRupiah(p.buyPrice)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(p.sellPrice)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.stock <= p.minStock ? 'destructive' : 'outline'}>
                      {p.stock} {p.unitSymbol}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                          <Pencil className="w-4 h-4" />
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
            <div className="space-y-2">
              <Label>Harga Beli *</Label>
              <Input
                type="number"
                placeholder="2500"
                value={form.buyPrice}
                onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Harga Jual *</Label>
              <Input
                type="number"
                placeholder="3000"
                value={form.sellPrice}
                onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
              />
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
    </div>
  )
}