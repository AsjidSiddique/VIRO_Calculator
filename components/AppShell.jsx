'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard',  icon: '📊', label: 'Dashboard' },
  { href: '/stocks',     icon: '📦', label: 'Stocks'    },
  { href: '/orders',     icon: '🛒', label: 'Orders'    },
  { href: '/products',   icon: '🏷️', label: 'Products'  },
  { href: '/calculator', icon: '🧮', label: 'Calc'      },
  { href: '/daily',      icon: '📅', label: 'Daily'     },
  { href: '/marketing',  icon: '📢', label: 'Marketing' },
  { href: '/search',     icon: '🔍', label: 'Search'    },
]

export default function AppShell({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('vc_dark') === 'true'
    setDark(saved)
    document.documentElement.classList.toggle('dark', saved)
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('vc_dark', next)
    document.documentElement.classList.toggle('dark', next)
  }

  const logout = () => {
    localStorage.removeItem('vc_token')
    router.push('/login')
  }

  const isActive = (href) =>
    href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-60 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-10 h-10 relative flex-shrink-0">
            <Image src="/logo.png" alt="ViroCalc" width={40} height={40}
              className="rounded-xl object-contain" priority />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm leading-none">ViroCalc</p>
            <p className="text-xs text-gray-400 mt-0.5">Business Manager</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive(item.href)
                  ? 'bg-violet-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 space-y-1">
          <button onClick={toggleDark}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
            <span>{dark ? '☀️' : '🌙'}</span>
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 relative flex-shrink-0">
              <Image src="/logo.png" alt="ViroCalc" width={32} height={32}
                className="rounded-lg object-contain" priority />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-sm">ViroCalc</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleDark} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={logout} className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-all text-sm">🚪</button>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-6 py-4 md:py-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ── Bottom nav mobile ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 z-30 flex items-center">
        {NAV.map(item => (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors
              ${isActive(item.href) ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[9px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
