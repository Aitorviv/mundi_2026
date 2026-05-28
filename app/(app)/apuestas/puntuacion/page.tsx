'use client'

import Link from 'next/link'

const SECTIONS = [
  {
    phase: 'Fase de grupos',
    emoji: '⚽',
    color: '#5b8ff9',
    rules: [
      { label: '1 punto', desc: 'por partido acertado (1X2)' },
    ],
    note: 'El marcador que introduces calcula automáticamente tu clasificación de grupos y tu bracket de eliminatorias.',
  },
  {
    phase: 'Dieciseisavos de final',
    emoji: '🔟',
    color: '#C9A84C',
    rules: [
      { label: '2 puntos', desc: 'por cada equipo acertado que pase la ronda' },
    ],
  },
  {
    phase: 'Octavos de final',
    emoji: '🏅',
    color: '#C9A84C',
    rules: [
      { label: '3 puntos', desc: 'por cada equipo acertado que pase la ronda' },
    ],
  },
  {
    phase: 'Cuartos de final',
    emoji: '⭐',
    color: '#C9A84C',
    rules: [
      { label: '4 puntos', desc: 'por cada equipo acertado que pase la ronda' },
    ],
  },
  {
    phase: 'Semifinales',
    emoji: '🔥',
    color: '#C8102E',
    rules: [
      { label: '6 puntos', desc: 'por cada semifinalista acertado' },
    ],
  },
  {
    phase: 'Final',
    emoji: '🏆',
    color: '#C8102E',
    rules: [
      { label: '9 puntos', desc: 'por cada finalista acertado' },
      { label: '12 puntos', desc: 'por acertar el campeón del mundo' },
    ],
    note: 'Si aciertas el campeón sumas 9 + 12 = 21 puntos en total.',
  },
  {
    phase: 'Máximo goleador',
    emoji: '🥅',
    color: '#C9A84C',
    rules: [
      { label: '1 punto', desc: 'por cada gol que marque el jugador que hayas escogido' },
      { label: '+1 punto extra', desc: 'si el jugador escogido resulta ser el máximo goleador del torneo' },
    ],
    note: 'Ejemplo: si apostaste por Mbappé y marca 7 goles siendo el máximo goleador → 7 + 1 = 8 puntos.',
  },
  {
    phase: 'Portero',
    emoji: '🧤',
    color: '#5b8ff9',
    rules: [
      { label: '1 punto', desc: 'por cada portería a 0 que consiga el portero escogido en 90 minutos (no se incluyen prórrogas), jugando al menos 60 minutos' },
    ],
    note: 'Ejemplo: si apostaste por Courtois y mantiene 5 porterías a 0 → 5 puntos.',
  },
  {
    phase: 'Mejor jugador del torneo',
    emoji: '🌟',
    color: '#C9A84C',
    rules: [
      { label: '4 puntos', desc: 'si el jugador escogido resulta elegido mejor jugador del torneo' },
    ],
  },
]

export default function PuntuacionPage() {
  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>Mundial 2026</div>
        <h1 style={{ fontSize: '24px', fontWeight: 500, color: '#ffffff', marginBottom: '6px' }}>Sistema de puntuación</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          Consulta aquí cómo se calculan los puntos antes de rellenar tu porra.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {SECTIONS.map((section, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            borderLeft: `4px solid ${section.color}`,
            borderRadius: '14px',
            padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <span style={{ fontSize: '28px', fontFamily: "'Noto Color Emoji', sans-serif", lineHeight: 1 }}>{section.emoji}</span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>{section.phase}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {section.rules.map((rule, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{
                    flexShrink: 0, fontSize: '14px', fontWeight: 700,
                    color: section.color,
                    background: `${section.color}18`,
                    border: `0.5px solid ${section.color}50`,
                    padding: '4px 12px', borderRadius: '20px', whiteSpace: 'nowrap',
                  }}>{rule.label}</span>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, paddingTop: '4px' }}>{rule.desc}</span>
                </div>
              ))}
            </div>

            {section.note && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `2px solid ${section.color}40` }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>💡 {section.note}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resumen rápido */}
      <div style={{ marginTop: '24px', background: 'rgba(201,168,76,0.06)', border: '0.5px solid rgba(201,168,76,0.25)', borderRadius: '14px', padding: '20px 24px' }}>
        <div style={{ fontSize: '12px', color: '#C9A84C', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px', fontWeight: 600 }}>Resumen rápido</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Grupos 1X2', pts: '1 pt' },
            { label: '1/16', pts: '2 pts' },
            { label: 'Octavos', pts: '3 pts' },
            { label: 'Cuartos', pts: '4 pts' },
            { label: 'Semis', pts: '6 pts' },
            { label: 'Final', pts: '9 pts' },
            { label: 'Campeón', pts: '+12 pts' },
            { label: 'Goleador', pts: '1pt/gol +1' },
            { label: 'Portero', pts: '1pt/P0' },
            { label: 'Mejor jugador', pts: '4 pts' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#C9A84C' }}>{item.pts}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link href="/apuestas" style={{
          display: 'inline-block', textDecoration: 'none',
          background: 'linear-gradient(90deg, #1A56C4, #C9A84C)',
          borderRadius: '10px', padding: '12px 28px',
          fontSize: '14px', fontWeight: 600, color: '#ffffff',
        }}>
          Ir a mis apuestas →
        </Link>
      </div>
    </div>
  )
}
