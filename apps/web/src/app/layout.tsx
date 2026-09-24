import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

/* ============================================================
   FONT SETUP
   - Inter          → UI / body (--font-sans)
   - JetBrains Mono → kode / angka (--font-mono)
   Variable ini dipakai di globals.css (@theme)
   ============================================================ */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

/* ============================================================
   METADATA
   ============================================================ */
export const metadata: Metadata = {
  title: 'Waregos',
  description: 'Sistem manajemen toko kelontong untuk Toko Rabay Orange',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1917' },
  ],
}

/* ============================================================
   ROOT LAYOUT
   ============================================================ */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* ThemeProvider custom (bukan next-themes) — tanpa props */}
        <ThemeProvider>
          {children}

          <Toaster
            richColors
            position="top-right"
            duration={4000}
            closeButton
          />
        </ThemeProvider>
      </body>
    </html>
  )
}