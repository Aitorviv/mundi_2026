import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const sections = [
  {
    href: '/apuestas/partidos',
    emoji: '⚽',
    title: 'Resultados de partidos',
    desc: 'Apuesta el marcador exacto de los 72 partidos de fase de grupos',
    pts: '3 pts resultado exacto · 1 pt ganador',
    color: '#1A56C4',
  },
  {
    href: '/apuestas/grupos',
    emoji: '📊',
    title: 'Posiciones de grupo',
    desc: '¿Quién queda 1º, 2º, 3º y 4º en cada uno de los 12 grupos?',
    pts: '2 pts posición exacta · 1 pt top 2',
    color: '#C9A84C',
  },
  {
    href: '/apuestas/especiales',
    emoji: '🌟',
    title: 'Apuestas especiales',
    desc: 'Campeón, subcampeón, 3er puesto, pichichi, bota y guante de oro',
    pts: 'Hasta 10 pts por acierto',
    color: '#C8102E',
  },
  {
    href: '/eliminatorias',
    emoji: '🏆',
    title: 'Eliminatorias',
    desc: 'Apuesta los resultados de la fase eliminatoria',
    pts: '3 pts resultado exacto · 1 pt ganador',
    color: '#C9A84C',
  },
]

export default async function ApuestasPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const { data: participant } = await supabase
    .from('participants')
    .select('total_points')
    .eq('id', session.id)
    .single()

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Cabecera */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>
          Porra
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#ffffff', marginBottom: '4px' }}>
          Bienvenido a la porra Mundial 2026
        </h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          {participant?.total_points ?? 0} puntos acumulados
        </p>
        <div style={{ width: '32px', height: '2px', background: 'linear-gradient(90deg, #1A56C4, #C8102E)', marginTop: '12px', borderRadius: '2px' }} />
      </div>

      {/* Secciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sections.map(s => (
          <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: `0.5px solid rgba(255,255,255,0.07)`,
              borderLeft: `3px solid ${s.color}`,
              borderRadius: '10px',
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: '16px',
              cursor: 'pointer',
            }}>
              <span style={{ fontSize: '28px', fontFamily: "'Noto Color Emoji', sans-serif", flexShrink: 0 }}>{s.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>{s.title}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px', lineHeight: 1.4 }}>{s.desc}</div>
                <div style={{ fontSize: '10px', color: s.color, letterSpacing: '0.5px' }}>{s.pts}</div>
              </div>
              <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
