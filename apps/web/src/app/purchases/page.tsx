'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Plus, Trash2, Loader2,
  ShoppingBag, ChevronDown, ChevronUp
} from 'lucide-react'
import { AxiosError } from 'axios'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface ProductOption { id: string; name: string; unitSymbol: string; buyPrice: number }
interface PurchaseItem { productId: string; productName: string; quantity: number; buyPrice: number; subtotal: number }
interface Purchase {
  id: string
  invoiceNumber: string
  supplierName: string | null
  userName: string
  status: string
  totalAmount: number
  notes: string | null
  purchasedAt: string
  items: PurchaseItem[]
}

interface RawProduct { id: string; name: string; unitSymbol: string; buyPrice: number }
interface FormItem { productId: string; productName: string; quantity: string; buyPrice: string }

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<FormItem[]>([
    { productId: '', productName: '', quantity: '1', buyPrice: '' }
  ])
  const [productSearch, setProductSearch] = useState<string[]>([''])
  const [productResults, setProductResults] = useState<ProductOption[][]>([[]])

  const fetchPurchases = async () => {
    try {
      const res = await api.get('/purchases', { params: { limit: 50 } })
      setPurchases(res.data.data)
    } catch {
      toast.error('Gagal memuat data pembelian')
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/products', { params: { limit: 200 } }),
      api.get('/purchases', { params: { limit: 50 } })
    ]).then(([prodRes, purRes]) => {
      setProducts(prodRes.data.data.map((p: RawProduct) => ({
        id: p.id,
        name: p.name,
        unitSymbol: p.unitSymbol,
        buyPrice: p.buyPrice,
      })))
      setPurchases(purRes.data.data)
    }).finally(() => setLoading(false))
  }, [])

  const searchProducts = async (query: string, index: number) => {
    const newSearches = [...productSearch]
    newSearches[index] = query
    setProductSearch(newSearches)

    if (!query) {
      const newResults = [...productResults]
      newResults[index] = []
      setProductResults(newResults)
      return
    }

    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 6)

    const newResults = [...productResults]
    newResults[index] = filtered
    setProductResults(newResults)
  }

  const selectProduct = (product: ProductOption, index: number) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      productId: product.id,
      productName: product.name,
      buyPrice: String(product.buyPrice),
    }
    setItems(newItems)

    const newSearches = [...productSearch]
    newSearches[index] = product.name
    setProductSearch(newSearches)

    const newResults = [...productResults]
    newResults[index] = []
    setProductResults(newResults)
  }

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: '1', buyPrice: '' }])
    setProductSearch([...productSearch, ''])
    setProductResults([...productResults, []])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
    setProductSearch(productSearch.filter((_, i) => i !== index))
    setProductResults(productResults.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof FormItem, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const totalAmount = items.reduce((sum, item) => {
    return sum + (Number(item.buyPrice) || 0) * (Number(item.quantity) || 0)
  }, 0)

  const handleSave = async () => {
    const validItems = items.filter(i => i.productId && i.quantity && i.buyPrice)
    if (validItems.length === 0) {
      toast.error('Tambahkan minimal 1 produk')
      return
    }

    setSaving(true)
    try {
      await api.post('/purchases', {
        items: validItems.map(i => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          buyPrice: Number(i.buyPrice),
        })),
        notes: notes || undefined,
      })
      toast.success('Pembelian berhasil dicatat!')
      setDialogOpen(false)
      setItems([{ productId: '', productName: '', quantity: '1', buyPrice: '' }])
      setProductSearch([''])
      setProductResults([[]])
      setNotes('')
      fetchPurchases()
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message ?? 'Gagal menyimpan pembelian')
      } else {
        toast.error('Gagal menyimpan pembelian')
      }
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
          <h1 className="text-2xl font-bold">Pembelian</h1>
          <p className="text-muted-foreground text-sm mt-1">Riwayat restok & pembelian stok</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Catat Pembelian
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : purchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <ShoppingBag className="w-12 h-12" />
          <p>Belum ada data pembelian</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Dicatat oleh</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => (
                <>
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(p.purchasedAt), 'd MMM yyyy', { locale: id })}
                    </TableCell>
                    <TableCell>{p.supplierName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{p.userName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(p.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      >
                        {expandedId === p.id
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />
                        }
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedId === p.id && (
                    <TableRow key={p.id + '-detail'}>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="space-y-2">
                          {p.items.map((item) => (
                            <div key={item.productId} className="flex justify-between text-sm">
                              <span>{item.productName} × {item.quantity}</span>
                              <span className="text-muted-foreground">
                                {formatRupiah(item.buyPrice)} / pcs = {formatRupiah(item.subtotal)}
                              </span>
                            </div>
                          ))}
                          {p.notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              Catatan: {p.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catat Pembelian Baru</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Items */}
            {items.map((item, index) => (
              <Card key={index}>
                <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Produk #{index + 1}</CardTitle>
                  {items.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                      onClick={() => removeItem(index)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {/* Product search */}
                  <div className="space-y-1 relative">
                    <Label className="text-xs">Nama Produk</Label>
                    <Input
                      placeholder="Ketik nama produk..."
                      value={productSearch[index]}
                      onChange={(e) => searchProducts(e.target.value, index)}
                    />
                    {productResults[index]?.length > 0 && (
                      <div className="absolute z-10 w-full bg-card border rounded-lg shadow-lg mt-1">
                        {productResults[index].map((p) => (
                          <button
                            key={p.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                            onClick={() => selectProduct(p, index)}
                          >
                            <span className="font-medium">{p.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {formatRupiah(p.buyPrice)} / {p.unitSymbol}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Jumlah</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Harga Beli (per satuan)</Label>
                      <Input
                        type="number"
                        placeholder="2500"
                        value={item.buyPrice}
                        onChange={(e) => updateItem(index, 'buyPrice', e.target.value)}
                      />
                    </div>
                  </div>

                  {item.productId && item.quantity && item.buyPrice && (
                    <p className="text-xs text-muted-foreground text-right">
                      Subtotal: {formatRupiah(Number(item.quantity) * Number(item.buyPrice))}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="w-full" onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Produk
            </Button>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Input
                placeholder="Restok dari distributor, dll..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Total */}
            <div className="bg-muted rounded-lg p-3 flex justify-between items-center">
              <span className="font-medium">Total Pembelian</span>
              <span className="text-lg font-bold">{formatRupiah(totalAmount)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Pembelian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}