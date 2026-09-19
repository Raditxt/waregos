'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Eye, EyeOff, Store, ArrowRight, Loader2 } from 'lucide-react'

/* ============================================================
   LOGIN PAGE
   Layout  : split 2 kolom (brand panel + form)
   Auth    : useAuthStore().login()
   Redirect: /dashboard kalau user ada
   ============================================================ */

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const isLoading = useAuthStore((s) => s.isLoading)
  const error = useAuthStore((s) => s.error)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const canSubmit = username.trim().length > 0 && password.length > 0 && !isLoading

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    try {
      await login(username.trim(), password)
      const { user } = useAuthStore.getState()
      if (user) {
        router.replace('/dashboard')
      }
    } catch {
      // error sudah ditangani di store (dipetakan ke `error`)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ============================================================
          LEFT — Brand Panel (desktop only)
          ============================================================ */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{
          background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Store className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">
            Waregos
          </span>
        </div>

        {/* Headline */}
        <div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-4">
            Kelola toko dengan
            <br />
            lebih mudah.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-md">
            Catat transaksi, pantau stok, dan kelola hutang pelanggan — semua
            dalam satu sistem yang simpel dan cepat.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex gap-4">
          {[
            { label: 'Transaksi', desc: 'POS terintegrasi' },
            { label: 'Stok', desc: 'Pantau real-time' },
            { label: 'Laporan', desc: 'Closing harian' },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm flex-1"
            >
              <p className="text-white font-bold">{item.label}</p>
              <p className="text-white/70 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          RIGHT — Login Form
          ============================================================ */}
      <div
        className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{ background: 'var(--background)' }}
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #f97316, #f59e0b)',
              }}
            >
              <Store className="w-5 h-5 text-white" />
            </div>
            <span
              className="font-bold text-xl"
              style={{ color: 'var(--foreground)' }}
            >
              Waregos
            </span>
          </div>

          {/* Greeting */}
          <div className="mb-8">
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              Selamat datang 👋
            </h2>
            <p style={{ color: 'var(--muted-foreground)' }}>
              Masuk untuk melanjutkan ke dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {/* Username */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all disabled:opacity-60"
                style={{
                  background: 'var(--muted)',
                  border: '1.5px solid var(--border)',
                  color: 'var(--foreground)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#f97316'
                  e.target.style.boxShadow = '0 0 0 3px rgb(249 115 22 / 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all disabled:opacity-60"
                  style={{
                    background: 'var(--muted)',
                    border: '1.5px solid var(--border)',
                    color: 'var(--foreground)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f97316'
                    e.target.style.boxShadow = '0 0 0 3px rgb(249 115 22 / 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? 'Sembunyikan password'
                      : 'Tampilkan password'
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors hover:opacity-80"
                  style={{ color: 'var(--muted-foreground)' }}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  background: 'var(--error-light)',
                  color: 'var(--error)',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-2"
              style={{
                background: !canSubmit
                  ? 'var(--border)'
                  : 'linear-gradient(135deg, #f97316, #f59e0b)',
                color: !canSubmit ? 'var(--muted-foreground)' : '#ffffff',
                cursor: !canSubmit ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Masuk…
                </>
              ) : (
                <>
                  Masuk <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p
            className="text-center text-xs mt-8"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Waregos v1.0 · Sistem Manajemen Toko Kelontong
          </p>
        </div>
      </div>
    </div>
  )
}