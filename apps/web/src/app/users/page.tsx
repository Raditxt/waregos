'use client'

import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import {
  Plus, KeyRound, UserX, UserCheck, Loader2, Users,
  AlertTriangle, X,
} from 'lucide-react'
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

interface UserForm {
  name: string
  username: string
  password: string
  role: 'ADMIN' | 'CASHIER'
}

const emptyForm: UserForm = { name: '', username: '', password: '', role: 'CASHIER' }

/* ============================================================
   Reusable: Modal shell — matches card style (rounded-2xl, border,
   var(--card)) used everywhere else in the design system.
   ============================================================ */
function Modal({
  open, onClose, title, icon: Icon, iconColor, iconBg, children, footer, maxWidth = '28rem',
}: {
  open: boolean
  onClose: () => void
  title: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  children: React.ReactNode
  footer: React.ReactNode
  maxWidth?: string
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(28,25,23,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl p-6"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: iconBg }}
            >
              <Icon className="w-4 h-4" style={{ color: iconColor }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--muted)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="flex justify-end gap-2 mt-6">{footer}</div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--background)',
  border: '1px solid var(--input)',
  color: 'var(--foreground)',
}

/* ============================================================
   Reusable: Buttons — mirrors the refresh-button pattern in
   dashboard.tsx (background/color swap via onMouseEnter/Leave).
   ============================================================ */
function PrimaryButton({
  onClick, disabled, children,
}: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
      style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--primary-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--primary)' }}
    >
      {children}
    </button>
  )
}

function OutlineButton({
  onClick, children, small = false,
}: { onClick?: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl font-medium transition-all ${small ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
      style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--primary-light)'
        e.currentTarget.style.color = 'var(--primary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--muted)'
        e.currentTarget.style.color = 'var(--muted-foreground)'
      }}
    >
      {children}
    </button>
  )
}

function DestructiveButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
      style={{ background: 'var(--error-light)', color: 'var(--error)', border: '1px solid transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--error)'; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--error-light)'; e.currentTarget.style.color = 'var(--error)' }}
    >
      {children}
    </button>
  )
}

function SuccessOutlineButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
      style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--success-light)'; e.currentTarget.style.color = 'var(--success)' }}
    >
      {children}
    </button>
  )
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const [confirmTarget, setConfirmTarget] = useState<User | null>(null)

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users')
      setUsers(res.data.data)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => { await fetchUsers() }
    init()
  }, [])

  const handleAddUser = async () => {
    if (!form.name || !form.username || !form.password) {
      toast.error('Semua field wajib diisi')
      return
    }
    setSaving(true)
    try {
      await api.post('/users', form)
      toast.success('User berhasil ditambahkan')
      setAddOpen(false)
      setForm(emptyForm)
      fetchUsers()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!confirmTarget) return
    const user = confirmTarget
    const action = user.isActive ? 'nonaktifkan' : 'aktifkan'
    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive })
      toast.success(`User berhasil di${action}kan`)
      setConfirmTarget(null)
      fetchUsers()
    } catch (error) {
      toast.error(getErrorMessage(error))
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
      setResetOpen(false)
      setNewPassword('')
      setSelectedUser(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Manage Users
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <Users className="w-3.5 h-3.5" style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Kelola akun pengguna sistem Waregos
            </p>
          </div>
        </div>
        <PrimaryButton onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Tambah User
        </PrimaryButton>
      </div>

      {/* List */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Memuat data user...</p>
          </div>
        ) : users.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-xl gap-3"
            style={{ background: 'var(--muted)' }}
          >
            <Users className="w-10 h-10" style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Belum ada user</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Nama', 'Username', 'Role', 'Status', 'Dibuat', ''].map((h, i) => (
                    <th
                      key={h || i}
                      className={`text-left py-3 px-3 text-xs font-medium ${i === 5 ? 'text-center' : ''}`}
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border)', opacity: u.isActive ? 1 : 0.5 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--muted)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td className="py-3 px-3 font-medium" style={{ color: 'var(--foreground)' }}>
                      {u.name}
                      {u.id === currentUser?.id && (
                        <span
                          className="ml-2 text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                        >
                          Kamu
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {u.username}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={
                          u.role === 'ADMIN'
                            ? { background: 'var(--primary-light)', color: 'var(--primary)' }
                            : { background: 'var(--muted)', color: 'var(--muted-foreground)' }
                        }
                      >
                        {u.role === 'ADMIN' ? 'Admin' : 'Kasir'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={
                          u.isActive
                            ? { background: 'var(--success-light)', color: 'var(--success)' }
                            : { background: 'var(--error-light)', color: 'var(--error)' }
                        }
                      >
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {format(new Date(u.createdAt), 'd MMM yyyy', { locale: id })}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-center gap-2">
                        <OutlineButton small onClick={() => { setSelectedUser(u); setResetOpen(true) }}>
                          <KeyRound className="w-3 h-3" />
                          Reset PW
                        </OutlineButton>
                        {u.id !== currentUser?.id && (
                          u.isActive ? (
                            <DestructiveButton onClick={() => setConfirmTarget(u)}>
                              <UserX className="w-3 h-3" />
                              Nonaktifkan
                            </DestructiveButton>
                          ) : (
                            <SuccessOutlineButton onClick={() => setConfirmTarget(u)}>
                              <UserCheck className="w-3 h-3" />
                              Aktifkan
                            </SuccessOutlineButton>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah User Baru"
        icon={Plus}
        iconColor="var(--primary)"
        iconBg="var(--primary-light)"
        footer={
          <>
            <OutlineButton onClick={() => setAddOpen(false)}>Batal</OutlineButton>
            <PrimaryButton onClick={handleAddUser} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Tambah User
            </PrimaryButton>
          </>
        }
      >
        <FormField label="Nama Lengkap *">
          <input
            className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-warm"
            style={inputStyle}
            placeholder="Nama Karyawan"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </FormField>
        <FormField label="Username *">
          <input
            className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-warm"
            style={inputStyle}
            placeholder="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </FormField>
        <FormField label="Password *">
          <input
            type="password"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-warm"
            style={inputStyle}
            placeholder="Minimal 6 karakter"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </FormField>
        <FormField label="Role">
          <select
            className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-warm"
            style={inputStyle}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'CASHIER' })}
          >
            <option value="CASHIER">Kasir</option>
            <option value="ADMIN">Admin</option>
          </select>
        </FormField>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={resetOpen}
        onClose={() => { setResetOpen(false); setNewPassword('') }}
        title={`Reset Password — ${selectedUser?.name ?? ''}`}
        icon={KeyRound}
        iconColor="var(--brand-accent)"
        iconBg="var(--accent-light)"
        footer={
          <>
            <OutlineButton onClick={() => { setResetOpen(false); setNewPassword('') }}>Batal</OutlineButton>
            <PrimaryButton onClick={handleResetPassword} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Reset Password
            </PrimaryButton>
          </>
        }
      >
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Password baru untuk user <span className="font-medium" style={{ color: 'var(--foreground)' }}>{selectedUser?.username}</span>:
        </p>
        <FormField label="Password Baru *">
          <input
            type="password"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-warm"
            style={inputStyle}
            placeholder="Minimal 6 karakter"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
          />
        </FormField>
      </Modal>

      {/* Confirm Toggle Active Modal */}
      <Modal
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title={confirmTarget?.isActive ? 'Nonaktifkan User' : 'Aktifkan User'}
        icon={AlertTriangle}
        iconColor={confirmTarget?.isActive ? 'var(--error)' : 'var(--success)'}
        iconBg={confirmTarget?.isActive ? 'var(--error-light)' : 'var(--success-light)'}
        footer={
          <>
            <OutlineButton onClick={() => setConfirmTarget(null)}>Batal</OutlineButton>
            {confirmTarget?.isActive ? (
              <DestructiveButton onClick={handleToggleActive}>Ya, Nonaktifkan</DestructiveButton>
            ) : (
              <SuccessOutlineButton onClick={handleToggleActive}>Ya, Aktifkan</SuccessOutlineButton>
            )}
          </>
        }
      >
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {confirmTarget?.isActive
            ? `User "${confirmTarget?.name}" akan dinonaktifkan dan tidak bisa login.`
            : `User "${confirmTarget?.name}" akan diaktifkan kembali.`}
        </p>
      </Modal>
    </div>
  )
}