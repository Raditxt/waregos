'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Loader2, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface ActivityLog {
  id: string
  userName: string
  username: string
  role: string
  action: string
  entityType: string | null
  entityId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

interface ActionOption { value: string; label: string }

/* Map aksi ke kelas badge semantic yang sudah didefinisikan di globals.css
   (.badge-primary / .badge-accent / .badge-success / .badge-error /
    .badge-warning / .badge-info / .badge-neutral) */
const ACTION_BADGE_CLASS: Record<string, string> = {
  LOGIN: 'badge-info',
  LOGOUT: 'badge-neutral',
  CHANGE_PASSWORD: 'badge-warning',
  RESET_PASSWORD: 'badge-accent',
  CREATE_PRODUCT: 'badge-success',
  UPDATE_PRODUCT: 'badge-info',
  DELETE_PRODUCT: 'badge-error',
  CREATE_TRANSACTION: 'badge-primary',
  CANCEL_TRANSACTION: 'badge-error',
  CREATE_PURCHASE: 'badge-accent',
  CREATE_USER: 'badge-success',
  UPDATE_USER: 'badge-info',
  ADJUST_STOCK: 'badge-warning',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--background)',
  border: '1px solid var(--input)',
  color: 'var(--foreground)',
}

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
  onClick, disabled, children,
}: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
      style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
      onMouseEnter={(e) => {
        if (disabled) return
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

export default function AuditPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [actions, setActions] = useState<ActionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [selectedAction, setSelectedAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today)

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(p), limit: '30' }
      if (selectedAction) params.action = selectedAction
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo

      const res = await api.get('/audit/logs', { params })
      setLogs(res.data.data)
      setTotal(res.data.meta.total)
      setTotalPages(res.data.meta.totalPages)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [selectedAction, dateFrom, dateTo])

  useEffect(() => {
    const init = async () => {
      const [actionsRes] = await Promise.all([
        api.get('/audit/actions'),
        fetchLogs(),
      ])
      setActions(actionsRes.data.data)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatDetails = (details: Record<string, unknown> | null): string => {
    if (!details) return '—'
    return Object.entries(details)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
  }

  const handleReset = () => {
    setSelectedAction('')
    setDateFrom('')
    setDateTo(today)
    setTimeout(() => fetchLogs(1), 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Activity Log
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Riwayat semua aktivitas pengguna — {total} total log
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <select
          className="rounded-lg px-3 py-2 text-sm outline-none focus-warm w-48"
          style={inputStyle}
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
        >
          <option value="">Semua aksi</option>
          {actions.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>

        <input
          type="date"
          className="rounded-lg px-3 py-2 text-sm outline-none focus-warm w-40"
          style={inputStyle}
          value={dateFrom}
          max={today}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          className="rounded-lg px-3 py-2 text-sm outline-none focus-warm w-40"
          style={inputStyle}
          value={dateTo}
          max={today}
          onChange={(e) => setDateTo(e.target.value)}
        />

        <PrimaryButton onClick={() => fetchLogs(1)} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Filter
        </PrimaryButton>
        <OutlineButton onClick={handleReset}>Reset</OutlineButton>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Memuat log aktivitas...</p>
          </div>
        ) : logs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-xl gap-3"
            style={{ background: 'var(--muted)' }}
          >
            <ShieldCheck className="w-10 h-10" style={{ color: 'var(--muted-foreground)' }} />
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Tidak ada log aktivitas</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Waktu', 'User', 'Aksi', 'Detail', 'IP'].map((h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-3 text-xs font-medium"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--muted)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="py-3 px-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
                        {format(new Date(log.createdAt), 'd MMM yyyy, HH:mm:ss', { locale: id })}
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{log.userName}</p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          @{log.username} · {log.role === 'ADMIN' ? 'Admin' : 'Kasir'}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`badge ${ACTION_BADGE_CLASS[log.action] ?? 'badge-neutral'}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs max-w-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                        {formatDetails(log.details)}
                      </td>
                      <td className="py-3 px-3 text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        {log.ipAddress ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="flex items-center justify-between mt-4 pt-4"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Halaman {page} dari {totalPages}
                </p>
                <div className="flex gap-2">
                  <OutlineButton disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>
                    Sebelumnya
                  </OutlineButton>
                  <OutlineButton disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)}>
                    Berikutnya
                  </OutlineButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}