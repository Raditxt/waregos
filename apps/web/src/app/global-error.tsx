'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="flex justify-center">
              <AlertTriangle className="w-16 h-16 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Sistem Bermasalah</h1>
              <p className="text-gray-500 text-sm mt-2">
                Terjadi kesalahan fatal. Silakan coba lagi atau hubungi admin.
              </p>
              {error.digest && (
                <p className="text-xs text-gray-400 mt-2 font-mono">
                  Kode: {error.digest}
                </p>
              )}
            </div>
            <Button onClick={reset}>Coba Lagi</Button>
          </div>
        </div>
      </body>
    </html>
  )
}