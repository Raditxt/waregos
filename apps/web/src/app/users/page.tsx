'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, KeyRound, UserX, UserCheck, Loader2, Users } from 'lucide-react'
import { AxiosError } from 'axios'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface User {
  id: string
  name: string
  username: string
  role: 'ADMIN' | 'CASHIER'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const emptyForm = { name: '', username: '', password: '', role: 'CASHIER' as 'ADMIN' | 'CASHIER' }

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  // 🔧 Bungkus fetchUsers dengan useCallback agar stabil
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users')
      setUsers(res.data.data)
    } catch {
      toast.error('Gagal memuat data user')
    } finally {
      setLoading(false)
    }
  }, []) // dependency kosong, karena tidak bergantung pada variabel lain

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers()
  }, [fetchUsers])

  const handleAddUser = async () => {
    if (!form.name || !form.username || !form.password) {
      toast.error('Semua field wajib diisi')
      return
    }
    setSaving(true)
    try {
      await api.post('/users', form)
      toast.success('User berhasil ditambahkan')
      setAddDialogOpen(false)
      setForm(emptyForm)
      fetchUsers()
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message ?? 'Gagal menambahkan user')
      } else {
        toast.error('Gagal menambahkan user')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    const action = user.isActive ? 'menonaktifkan' : 'mengaktifkan'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user "${user.name}"?`)) return

    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive })
      toast.success(`User berhasil di${action}`)
      fetchUsers()
    } catch {
      toast.error(`Gagal ${action} user`)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter')
      return
    }
    setSaving(true)
    try {
      await api.patch(`/users/${selectedUser?.id}/reset-password`, { newPassword })
      toast.success(`Password ${selectedUser?.name} berhasil direset`)
      setResetDialogOpen(false)
      setNewPassword('')
      setSelectedUser(null)
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.message ?? 'Gagal reset password')
      } else {
        toast.error('Gagal reset password')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola akun pengguna sistem Waregos
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah User
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Users className="w-12 h-12" />
          <p>Belum ada user</p>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">
                      {u.name}
                      {u.id === currentUser?.id && (
                        <Badge variant="outline" className="ml-2 text-xs">Kamu</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{u.username}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {u.role === 'ADMIN' ? 'Admin' : 'Kasir'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? 'outline' : 'destructive'}>
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(u.createdAt), 'd MMM yyyy', { locale: id })}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(u)
                            setResetDialogOpen(true)
                          }}
                        >
                          <KeyRound className="w-3 h-3 mr-1" />
                          Reset PW
                        </Button>
                        {u.id !== currentUser?.id && (
                          <Button
                            size="sm"
                            variant={u.isActive ? 'destructive' : 'outline'}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.isActive
                              ? <><UserX className="w-3 h-3 mr-1" />Nonaktifkan</>
                              : <><UserCheck className="w-3 h-3 mr-1" />Aktifkan</>
                            }
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah User Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                placeholder="Nama Karyawan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                placeholder="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as 'ADMIN' | 'CASHIER' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASHIER">Kasir</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAddUser} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tambah User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password — {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Password baru untuk user <span className="font-medium">{selectedUser?.username}</span>:
            </p>
            <div className="space-y-2">
              <Label>Password Baru *</Label>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetDialogOpen(false)
              setNewPassword('')
            }}>
              Batal
            </Button>
            <Button onClick={handleResetPassword} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}