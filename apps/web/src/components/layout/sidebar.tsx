'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  TrendingUp,
  ShoppingBag,
  LogOut,
  Store,
  ChevronRight,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/pos', label: 'Kasir / POS', icon: ShoppingCart, adminOnly: false },
  { href: '/products', label: 'Produk', icon: Package, adminOnly: false },
  { href: '/purchases', label: 'Pembelian', icon: ShoppingBag, adminOnly: true },
  { href: '/reports', label: 'Laporan', icon: TrendingUp, adminOnly: true },
  { href: '/users', label: 'Users', icon: Users, adminOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    toast.success('Berhasil logout')
    router.push('/login')
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-card border-r">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="bg-primary rounded-lg p-2">
          <Store className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-bold text-base leading-none">Waregos</p>
          <p className="text-xs text-muted-foreground mt-0.5">Toko Kelontong</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems
          .filter(item => !item.adminOnly || user?.role === 'ADMIN')
          .map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link key={href} href={href}>
                <div className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3 h-3" />}
                </div>
              </Link>
            )
          })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t space-y-3">
        <div className="px-3 py-2 rounded-lg bg-muted">
          <p className="text-sm font-medium truncate">{user?.name ?? '-'}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={user?.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
              {user?.role === 'ADMIN' ? 'Admin' : 'Kasir'}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  )
}