'use client'

import { useState } from 'react'
import { api, getErrorMessage } from '@/lib/api'
import { toast } from 'sonner'
import { X, Plus, Pencil, Trash2, Check, Loader2, Tags } from 'lucide-react'

export interface CategoryItem {
  id: string
  name: string
  productCount: number
}

interface CategoryManagerProps {
  open: boolean
  categories: CategoryItem[]
  onClose: () => void
  onChanged: () => void | Promise<void>
}

function IconBtn({
  onClick, title, disabled, tone = 'primary', children,
}: {
  onClick: () => void
  title: string
  disabled?: boolean
  tone?: 'primary' | 'error'
  children: React.ReactNode
}) {
  const hover = tone === 'error'
    ? { bg: 'var(--error-light)', fg: 'var(--error)' }
    : { bg: 'var(--primary-light)', fg: 'var(--primary)' }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="p-1.5 rounded-lg transition-all shrink-0 disabled:cursor-not-allowed"
      style={{ color: 'var(--muted-foreground)', opacity: disabled ? 0.35 : 1 }}
      onMouseEnter={(e) => {
        if (disabled) return
        e.currentTarget.style.background = hover.bg
        e.currentTarget.style.color = hover.fg
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--muted-foreground)'
      }}
    >
      {children}
    </button>
  )
}

export function CategoryManager({ open, categories, onClose, onChanged }: CategoryManagerProps) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  if (!open) return null

  const close = () => {
    setNewName('')
    setEditingId(null)
    setConfirmDeleteId(null)
    onClose()
  }

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) {
      toast.error('Nama kategori wajib diisi')
      return
    }
    setAdding(true)
    try {
      await api.post('/catalog/categories', { name })
      toast.success('Kategori ditambahkan')
      setNewName('')
      await onChanged()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (c: CategoryItem) => {
    setConfirmDeleteId(null)
    setEditingId(c.id)
    setEditingName(c.name)
  }

  const saveEdit = async (c: CategoryItem) => {
    const name = editingName.trim()
    if (!name) {
      toast.error('Nama kategori wajib diisi')
      return
    }
    if (name === c.name) {
      setEditingId(null)
      return
    }
    setBusyId(c.id)
    try {
      await api.patch(`/catalog/categories/${c.id}`, { name })
      toast.success('Kategori diperbarui')
      setEditingId(null)
      await onChanged()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (c: CategoryItem) => {
    setBusyId(c.id)
    try {
      await api.delete(`/catalog/categories/${c.id}`)
      toast.success('Kategori dihapus')
      setConfirmDeleteId(null)
      await onChanged()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--primary-light)' }}
            >
              <Tags className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            </div>
            <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>
              Kelola Kategori
            </h2>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tambah */}
        <div
          className="px-6 py-4 shrink-0 flex gap-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <input
            type="text"
            placeholder="Nama kategori baru..."
            value={newName}
            maxLength={50}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white shrink-0"
            style={{
              background: 'linear-gradient(135deg, #f97316, #f59e0b)',
              opacity: adding ? 0.6 : 1,
            }}
          >
            {adding
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Plus className="w-4 h-4" />}
            Tambah
          </button>
        </div>

        {/* Daftar */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {categories.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--muted-foreground)' }}>
              Belum ada kategori
            </p>
          ) : (
            categories.map((c) => {
              const isEditing = editingId === c.id
              const isConfirming = confirmDeleteId === c.id
              const busy = busyId === c.id
              const inUse = c.productCount > 0

              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--muted)' }}
                >
                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={editingName}
                        maxLength={50}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(c)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-sm outline-none"
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--primary)',
                          color: 'var(--foreground)',
                        }}
                      />
                      <IconBtn onClick={() => saveEdit(c)} title="Simpan" disabled={busy}>
                        {busy
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Check className="w-3.5 h-3.5" />}
                      </IconBtn>
                      <IconBtn onClick={() => setEditingId(null)} title="Batal">
                        <X className="w-3.5 h-3.5" />
                      </IconBtn>
                    </>
                  ) : isConfirming ? (
                    <>
                      <p className="flex-1 min-w-0 text-sm truncate" style={{ color: 'var(--foreground)' }}>
                        Hapus &quot;{c.name}&quot;?
                      </p>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={busy}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1"
                        style={{ background: 'var(--error)', opacity: busy ? 0.6 : 1 }}
                      >
                        {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                        Hapus
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: 'var(--card)',
                          color: 'var(--foreground)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        Batal
                      </button>
                    </>
                  ) : (
                    <>
                      <p
                        className="flex-1 min-w-0 text-sm font-medium truncate"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {c.name}
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}
                      >
                        {c.productCount} produk
                      </span>
                      <IconBtn onClick={() => startEdit(c)} title="Ubah nama">
                        <Pencil className="w-3.5 h-3.5" />
                      </IconBtn>
                      <IconBtn
                        onClick={() => {
                          setEditingId(null)
                          setConfirmDeleteId(c.id)
                        }}
                        title={inUse ? `Masih dipakai ${c.productCount} produk aktif` : 'Hapus kategori'}
                        disabled={inUse}
                        tone="error"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconBtn>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>

        <p
          className="px-6 py-3 text-xs shrink-0"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
        >
          Kategori baru bisa dihapus setelah semua produk aktif di dalamnya dihapus.
        </p>
      </div>
    </div>
  )
}