import Link from 'next/link'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const session = await getSession()
  if (!session?.is_admin) redirect('/admin/restringido')

  const cards = [
    { href: '/admin/resultados',  emoji: '⚽', title: 'Resultados de partidos', desc: 'Introduce marcadores y recalcula puntos', color: '#1A56C4' },
    { href: '/admin/especiales',  emoji: '🌟', title: 'Premios individuales',   desc: 'Gestiona puntos de goleador, portero y mejor jugador', color: '#C9A84C' },
    { href: '/admin/participantes', emoji: '👥', title: 'Participantes',        desc: 'Crea y gestiona los usuarios de la porra', color: '#C8102E' },
  ]

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>Panel administrador</div>
        <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#ffffff', marginBottom: '4px' }}>Admin</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Gestiona la porra del Mundial 2026</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cards.map(card => (
          <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${card.color}`,
              borderRadius: '12px', padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: '16px',
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '28px', fontFamily: "'Noto Color Emoji', sans-serif" }}>{card.emoji}</span>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>{card.title}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{card.desc}</div>
              </div>
              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)', fontSize: '16px' }}>›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
