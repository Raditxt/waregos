'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select'
// import { Badge } from '@/components/ui/badge'  <-- dihapus karena tidak digunakan
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

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
  CHANGE_PASSWORD: 'bg-yellow-100 text-yellow-700',
  RESET_PASSWORD: 'bg-orange-100 text-orange-700',
  CREATE_PRODUCT: 'bg-green-100 text-green-700',
  UPDATE_PRODUCT: 'bg-teal-100 text-teal-700',
  DELETE_PRODUCT: 'bg-red-100 text-red-700',
  CREATE_TRANSACTION: 'bg-purple-100 text-purple-700',
  CANCEL_TRANSACTION: 'bg-red-100 text-red-700',
  CREATE_PURCHASE: 'bg-indigo-100 text-indigo-700',
  CREATE_USER: 'bg-green-100 text-green-700',
  UPDATE_USER: 'bg-teal-100 text-teal-700',
  ADJUST_STOCK: 'bg-orange-100 text-orange-700',
}

export default function AuditPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [actions, setActions] = useState<ActionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
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
        fetchLogs(), // fetchLogs sudah async, akan dijalankan paralel
      ])
      setActions(actionsRes.data.data)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Hanya dijalankan sekali saat mount

  const formatDetails = (details: Record<string, unknown> | null): string => {
    if (!details) return '—'
    return Object.entries(details)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Activity Log
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Riwayat semua aktivitas pengguna — {total} total log
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedAction}
          onValueChange={setSelectedAction}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua aksi</SelectItem>
            {actions.map(a => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-40"
          value={dateFrom}
          max={today}
          placeholder="Dari tanggal"
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Input
          type="date"
          className="w-40"
          value={dateTo}
          max={today}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <Button onClick={() => fetchLogs(1)} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Filter'}
        </Button>
        <Button variant="outline" onClick={() => {
          setSelectedAction('')
          setDateFrom('')
          setDateTo(today)
          setTimeout(() => fetchLogs(1), 100)
        }}>
          Reset
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Tidak ada log aktivitas
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), 'd MMM yyyy, HH:mm:ss', { locale: id })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{log.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          @{log.username} · {log.role === 'ADMIN' ? 'Admin' : 'Kasir'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {formatDetails(log.details)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {log.ipAddress ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Halaman {page} dari {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => fetchLogs(page - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => fetchLogs(page + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}