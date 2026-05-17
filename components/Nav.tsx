'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/apuestas',      label: 'Mis apuestas',   emoji: '🎯' },
  { href: '/partidos',      label: 'Partidos',        emoji: '⚽' },
  { href: '/clasificacion', label: 'Clasificación',   emoji: '🏅' },
]

export default function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/apuestas" className="font-bold text-white flex items-center gap-2">
          <span>🏆</span>
          <span className="hidden sm:inline text-sm">Mundial 2026</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith(link.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{link.emoji}</span>
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/admin')
                  ? 'bg-orange-600 text-white'
                  : 'text-orange-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="ml-2 text-gray-500 hover:text-white text-sm px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  )
}
