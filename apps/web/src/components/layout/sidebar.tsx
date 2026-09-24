'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  LayoutDashboard, ShoppingCart, Package, TrendingUp,
  ShoppingBag, BookCheck, CreditCard, Users,
  ShieldCheck, LogOut, ChevronRight,
  PanelLeft, PanelLeftClose
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/pos', label: 'Kasir / POS', icon: ShoppingCart, adminOnly: false },
  { href: '/products', label: 'Produk', icon: Package, adminOnly: false },
  { href: '/purchases', label: 'Pembelian', icon: ShoppingBag, adminOnly: true },
  { href: '/closing', label: 'Closing', icon: BookCheck, adminOnly: false },
  { href: '/debts', label: 'Hutang', icon: CreditCard, adminOnly: false },
  { href: '/reports', label: 'Laporan', icon: TrendingUp, adminOnly: true },
  { href: '/users', label: 'Users', icon: Users, adminOnly: true },
  { href: '/audit', label: 'Audit Log', icon: ShieldCheck, adminOnly: true },
]

interface SidebarProps {
  pinned: boolean
  onTogglePin: () => void
  isHoverExpanded: boolean
}

export function Sidebar({ pinned, onTogglePin, isHoverExpanded }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const isExpanded = pinned || isHoverExpanded

  const filteredItems = navItems.filter(
    item => !item.adminOnly || isAdmin
  )

  return (
    <aside
      className="flex flex-col min-h-screen shrink-0"
      style={{
        width: isExpanded ? '240px' : '60px',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
    >
      {/* Brand Row */}
      <div
        className="flex items-center px-3 py-3 shrink-0"
        style={{
          borderBottom: '1px solid var(--sidebar-border)',
          minHeight: '60px',
          gap: '10px',
        }}
      >
        {/* Logo — SVG storefront */}
        <div
          className="shrink-0 flex items-center justify-center rounded-xl"
          style={{
            width: '34px',
            height: '34px',
            minWidth: '34px',
            background: 'linear-gradient(135deg, #f97316, #f59e0b)',
          }}
        >
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '20px', height: '20px' }}
          >
            <path d="M8 26L32 12L56 26Z" fill="white" opacity="0.95" />
            <rect x="14" y="26" width="36" height="26" rx="2" fill="white" opacity="0.95" />
            <rect x="24" y="38" width="16" height="14" rx="2" fill="#f97316" />
            <rect x="16" y="29" width="10" height="8" rx="1.5" fill="#f97316" opacity="0.7" />
            <rect x="38" y="29" width="10" height="8" rx="1.5" fill="#f97316" opacity="0.7" />
            <rect x="10" y="23" width="44" height="5" rx="1" fill="white" opacity="0.6" />
          </svg>
        </div>

        {/* Brand text */}
        <div
          className="flex-1 min-w-0 overflow-hidden"
          style={{
            opacity: isExpanded ? 1 : 0,
            width: isExpanded ? 'auto' : '0px',
            transition: 'opacity 0.15s ease',
          }}
        >
          <p className="font-bold text-sm leading-tight truncate"
            style={{ color: 'var(--foreground)', whiteSpace: 'nowrap' }}
          >
            Waregos
          </p>
          <p className="text-xs truncate"
            style={{ color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}
          >
            Toko Rabay Orange
          </p>
        </div>

        {/* Pin toggle — only visible when expanded */}
        <button
          onClick={onTogglePin}
          title={pinned ? 'Unpin sidebar (hover mode)' : 'Pin sidebar (always open)'}
          className="shrink-0 flex items-center justify-center rounded-lg transition-all duration-150"
          style={{
            width: '28px',
            height: '28px',
            minWidth: '28px',
            opacity: isExpanded ? 1 : 0,
            pointerEvents: isExpanded ? 'auto' : 'none',
            background: pinned ? 'var(--primary-light)' : 'transparent',
            border: `1px solid ${pinned ? 'var(--primary)' : 'var(--border)'}`,
            color: pinned ? 'var(--primary)' : 'var(--muted-foreground)',
            transition: 'opacity 0.15s ease, background 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!pinned) {
              e.currentTarget.style.background = 'var(--primary-light)'
              e.currentTarget.style.borderColor = 'var(--primary)'
              e.currentTarget.style.color = 'var(--primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (!pinned) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--muted-foreground)'
            }
          }}
        >
          {pinned
            ? <PanelLeftClose className="w-3.5 h-3.5" />
            : <PanelLeft className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {filteredItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href))

          return (
            <Link
              key={href}
              href={href}
              title={!isExpanded ? label : undefined}
              className="relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 group"
              style={{
                padding: '9px 10px',
                gap: '10px',
                background: isActive ? 'var(--sidebar-item-active-bg)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--sidebar-item-hover)'
                  e.currentTarget.style.color = 'var(--foreground)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--muted-foreground)'
                }
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />

              <span
                className="flex-1 truncate"
                style={{
                  opacity: isExpanded ? 1 : 0,
                  transition: 'opacity 0.12s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>

              {isActive && isExpanded && (
                <ChevronRight className="w-3 h-3 shrink-0" />
              )}

              {/* Tooltip saat collapsed */}
              {!isExpanded && (
                <span
                  className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{
                    background: 'var(--foreground)',
                    color: 'var(--background)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  {label}
                  <span
                    style={{
                      position: 'absolute',
                      left: '-4px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '8px',
                      height: '8px',
                      background: 'var(--foreground)',
                      clipPath: 'polygon(100% 0, 100% 100%, 0 50%)',
                    }}
                  />
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div
        className="px-2 py-3 space-y-1.5 shrink-0"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        {/* Theme toggle */}
        <div
          className="flex items-center px-2 py-1"
          style={{ justifyContent: isExpanded ? 'space-between' : 'center' }}
        >
          <span
            className="text-xs overflow-hidden"
            style={{
              color: 'var(--muted-foreground)',
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? 'auto' : '0',
              transition: 'opacity 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Tema
          </span>
          <ThemeToggle />
        </div>

        {/* User */}
        <div
          className="flex items-center rounded-xl overflow-hidden"
          style={{
            gap: '10px',
            padding: isExpanded ? '8px 10px' : '4px 0',
            background: isExpanded ? 'var(--muted)' : 'transparent',
            justifyContent: isExpanded ? 'flex-start' : 'center',
            transition: 'background 0.15s ease, padding 0.2s ease',
          }}
        >
          <div
            className="shrink-0 flex items-center justify-center rounded-lg text-xs font-bold"
            title={!isExpanded ? `${user?.name} — Logout` : undefined}
            onClick={!isExpanded ? logout : undefined}
            style={{
              width: '30px',
              height: '30px',
              minWidth: '30px',
              background: 'linear-gradient(135deg, #f97316, #f59e0b)',
              color: '#ffffff',
              cursor: !isExpanded ? 'pointer' : 'default',
            }}
          >
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>

          {isExpanded && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate"
                  style={{ color: 'var(--foreground)' }}
                >
                  {user?.name}
                </p>
                <p className="text-xs truncate"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {isAdmin ? 'Admin' : 'Kasir'}
                </p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-lg transition-all duration-150 shrink-0"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--error-light)'
                  e.currentTarget.style.color = 'var(--error)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--muted-foreground)'
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}