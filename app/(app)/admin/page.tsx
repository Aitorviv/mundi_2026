import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Link from 'next/link'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.is_admin) redirect('/admin/restringido')

  const adminLinks = [
    { href: '/admin/resultados',    emoji: '⚽', title: 'Introducir resultados', desc: 'Añade el marcador de cada partido y recalcula puntos', color: '#C9A84C' },
    { href: '/admin/participantes', emoji: '👥', title: 'Gestionar participantes', desc: 'Crea nuevos usuarios y asigna sus credenciales de acceso', color: '#5b8ff9' },
  ]

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>
          Panel administrador
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Admin</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Bienvenido, {session.name}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {adminLinks.map(link => (
          <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '0.5px solid rgba(255,255,255,0.07)',
              borderLeft: `3px solid ${link.color}`,
              borderRadius: '10px', padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
              transition: 'background 0.15s',
            }}>
              <span style={{ fontSize: '28px', fontFamily: "'Noto Color Emoji', sans-serif", flexShrink: 0 }}>{link.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>{link.title}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{link.desc}</div>
              </div>
              <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
