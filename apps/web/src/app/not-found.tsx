import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-muted rounded-full p-6">
            <FileQuestion className="w-12 h-12 text-muted-foreground" />
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-xl font-medium mt-1">Halaman Tidak Ditemukan</p>
          <p className="text-muted-foreground text-sm mt-2">
            Halaman yang kamu cari tidak ada atau sudah dipindahkan.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Kembali ke Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}