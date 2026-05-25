'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isBettingOpen, BET_DEADLINE } from '@/lib/deadline'

export default function ApuestasPage() {
  const [stats, setStats] = useState({
    matchBets: 0, knockoutPicks: 0, specialBets: 0,
  })
  const [loading, setLoading] = useState(true)
  const bettingOpen = isBettingOpen()

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()
    if (!session?.id) { setLoading(false); return }

    const [matchRes, knockoutRes, specialRes] = await Promise.all([
      supabase.from('match_bets').select('id', { count: 'exact' }).eq('participant_id', session.id),
      supabase.from('knockout_picks').select('id', { count: 'exact' }).eq('participant_id', session.id),
      supabase.from('special_bets').select('id', { count: 'exact' }).eq('participant_id', session.id),
    ])

    setStats({
      matchBets: matchRes.count ?? 0,
      knockoutPicks: knockoutRes.count ?? 0,
      specialBets: specialRes.count ?? 0,
    })
    setLoading(false)
  }

  const deadline = new Date(BET_DEADLINE)
  const deadlineStr = deadline.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric',
    month: 'long', hour: '2-digit', minute: '2-digit',
  })

  const sections = [
    {
      href: '/apuestas/partidos',
      emoji: '⚽',
      title: 'Partidos de grupos',
      desc: 'Apuesta el marcador de los 72 partidos de la fase de grupos',
      pts: '1 pt por 1X2 correcto',
      color: '#5b8ff9',
      done: stats.matchBets,
      total: 72,
    },
    {
      href: '/eliminatorias',
      emoji: '🏆',
      title: 'Eliminatorias',
      desc: 'Tu bracket personal generado desde tus marcadores de grupos',
      pts: '2→3→4→6→9→+12 pts',
      color: '#C8102E',
      done: stats.knockoutPicks,
      total: 31,
    },
    {
      href: '/apuestas/especiales',
      emoji: '🌟',
      title: 'Premios individuales',
      desc: 'Goleador, portero y mejor jugador del torneo',
      pts: 'Hasta 4 pts + goles/porterías',
      color: '#C9A84C',
      done: stats.specialBets,
      total: 3,
    },
  ]

  const totalDone = stats.matchBets + stats.knockoutPicks + stats.specialBets
  const totalAll = 72 + 31 + 3
  const pct = Math.round((totalDone / totalAll) * 100)

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>Mundial 2026</div>
        <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#ffffff', marginBottom: '4px' }}>Mis apuestas</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>
          {bettingOpen
            ? `Plazo hasta el ${deadlineStr}`
            : 'Apuestas cerradas · el torneo ha comenzado'}
        </p>

        {/* Progreso global */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '60px', textAlign: 'right' }}>{pct}% completado</span>
        </div>
      </div>

      {/* Estado del plazo */}
      <div style={{
        background: bettingOpen ? 'rgba(26,86,196,0.08)' : 'rgba(200,16,46,0.08)',
        border: `0.5px solid ${bettingOpen ? 'rgba(26,86,196,0.3)' : 'rgba(200,16,46,0.3)'}`,
        borderRadius: '10px', padding: '12px 16px', marginBottom: '24px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{ fontSize: '20px', fontFamily: "'Noto Color Emoji', sans-serif" }}>
          {bettingOpen ? '🟢' : '🔒'}
        </span>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#ffffff' }}>
            {bettingOpen ? 'Apuestas abiertas' : 'Apuestas cerradas'}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {bettingOpen
              ? `Cierre: ${deadlineStr}`
              : 'Ya no se pueden modificar las apuestas'}
          </div>
        </div>
      </div>

      {/* Secciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sections.map(section => {
          const complete = section.done >= section.total
          const sectionPct = Math.round((section.done / section.total) * 100)

          return (
            <Link key={section.href} href={section.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: `0.5px solid ${complete ? `${section.color}40` : 'rgba(255,255,255,0.06)'}`,
                borderLeft: `3px solid ${complete ? section.color : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px', padding: '16px 20px',
                transition: 'all 0.15s', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px', fontFamily: "'Noto Color Emoji', sans-serif" }}>{section.emoji}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff', marginBottom: '2px' }}>{section.title}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{section.desc}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                    {complete
                      ? <span style={{ fontSize: '18px', fontFamily: "'Noto Color Emoji', sans-serif" }}>✅</span>
                      : <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{section.done}/{section.total}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${sectionPct}%`, background: section.color, borderRadius: '2px', opacity: 0.7, transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: '10px', color: section.color, background: `${section.color}15`, border: `0.5px solid ${section.color}40`, padding: '2px 7px', borderRadius: '20px', flexShrink: 0 }}>
                    {section.pts}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Instrucciones */}
      <div style={{ marginTop: '24px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '14px 18px' }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Cómo funciona</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          <div>1️⃣ Apuesta el marcador de los 72 partidos de grupos</div>
          <div>2️⃣ Tu clasificación de grupos se calcula automáticamente</div>
          <div>3️⃣ El bracket de eliminatorias se genera desde tu clasificación</div>
          <div>4️⃣ Elige quién pasa en cada cruce eliminatorio</div>
          <div>5️⃣ Añade tus apuestas de goleador, portero y mejor jugador</div>
        </div>
      </div>
    </div>
  )
}
