'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const initialized = useRef(false)

  // Load from localStorage — once on mount
  useEffect(() => {
    const init = () => {
      const stored = localStorage.getItem('waregos-theme') as Theme | null
      if (stored) setThemeState(stored)
      initialized.current = true
    }
    init()
  }, [])

  // Apply theme to DOM
  useEffect(() => {
    if (!initialized.current && theme === 'system') return
    const root = document.documentElement
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved: 'light' | 'dark' = theme === 'system'
      ? (systemDark ? 'dark' : 'light')
      : theme

    const applyTheme = () => {
      setResolvedTheme(resolved)
      root.setAttribute('data-theme', resolved)
      localStorage.setItem('waregos-theme', theme)
    }
    applyTheme()
  }, [theme])

  const setTheme = (t: Theme) => setThemeState(t)

  const toggleTheme = () => {
    setThemeState(prev => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'light'
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return systemDark ? 'light' : 'dark'
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)