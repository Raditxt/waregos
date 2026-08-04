'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('System error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="bg-red-100 dark:bg-red-950 rounded-full p-6">
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Terjadi Kesalahan</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Sistem mengalami gangguan. Tim teknis sudah diberitahu.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted px-2 py-1 rounded">
              Kode Error: {error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            Ke Dashboard
          </Button>
          <Button onClick={reset}>
            Coba Lagi
          </Button>
        </div>
      </div>
    </div>
  )
}