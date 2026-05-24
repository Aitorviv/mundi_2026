'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const links = [
  { href: '/apuestas',          label: 'Apuestas',       emoji: '🎯' },
  { href: '/apuestas/partidos', label: 'Partidos',        emoji: '⚽' },
  { href: '/eliminatorias',     label: 'Eliminatorias',  emoji: '🏆' },
  { href: '/clasificacion',     label: 'Clasificación',  emoji: '🏅' },
]

export default function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav style={{
      background: 'rgba(5,8,20,0.85)',
      borderBottom: '0.5px solid rgba(200,16,46,0.45)',
      backdropFilter: 'blur(8px)',
      position: 'sticky', top: 0, zIndex: 50,
      height: '52px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
    }}>
      <Link href="/apuestas" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <span style={{ fontSize: '20px', fontFamily: "'Noto Color Emoji', sans-serif" }}>🏆</span>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#C9A84C', letterSpacing: '2px', textTransform: 'uppercase' }}>Mundial 2026</div>
          <div style={{ fontSize: '9px', color: 'rgba(201,168,76,0.45)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>USA · México · Canadá</div>
        </div>
      </Link>

      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {links.map(link => {
          const active = pathname === link.href || (link.href !== '/apuestas' && pathname.startsWith(link.href))
          return (
            <Link key={link.href} href={link.href} style={{
              fontSize: '10px',
              color: active ? '#ff4d6a' : 'rgba(255,255,255,0.35)',
              padding: '5px 10px', borderRadius: '5px', textDecoration: 'none',
              letterSpacing: '0.5px', textTransform: 'uppercase',
              background: active ? 'rgba(200,16,46,0.18)' : 'transparent',
              border: active ? '0.5px solid rgba(200,16,46,0.35)' : '0.5px solid transparent',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <span>{link.emoji}</span>
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          )
        })}

        {isAdmin && (
          <Link href="/admin" style={{
            fontSize: '10px',
            color: pathname.startsWith('/admin') ? '#ff4d6a' : 'rgba(200,16,46,0.5)',
            padding: '5px 10px', borderRadius: '5px', textDecoration: 'none',
            letterSpacing: '0.5px', textTransform: 'uppercase',
            background: pathname.startsWith('/admin') ? 'rgba(200,16,46,0.18)' : 'transparent',
            border: '0.5px solid transparent',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <span>⚙️</span>
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}

        <button onClick={handleLogout} style={{
          fontSize: '10px', color: 'rgba(255,255,255,0.2)',
          padding: '5px 10px', borderRadius: '5px',
          background: 'transparent', border: '0.5px solid transparent',
          cursor: 'pointer', letterSpacing: '0.5px', textTransform: 'uppercase', marginLeft: '4px',
        }}>
          Salir
        </button>
      </div>
    </nav>
  )
}
