'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Participant = {
  id: string
  display_name: string
  username: string
  total_points: number
  match_pts?: number
  knockout_pts?: number
  special_pts?: number
}

export default function ClasificacionPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()
    if (session?.id) setMe(session.id)

    const { data: parts } = await supabase
      .from('participants')
      .select('id, display_name, username, total_points')
      .eq('approved', true)
      .order('total_points', { ascending: false })

    if (!parts?.length) { setLoading(false); return }

    // Cargar desglose de puntos por participante
    const ids = parts.map(p => p.id)
    const [matchRes, knockoutRes, specialRes] = await Promise.all([
      supabase.from('match_bets').select('participant_id, points_earned').in('participant_id', ids),
      supabase.from('knockout_picks').select('participant_id, points_earned').in('participant_id', ids),
      supabase.from('special_bets').select('participant_id, points_earned').in('participant_id', ids),
    ])

    const sum = (rows: any[], id: string) =>
      (rows ?? []).filter(r => r.participant_id === id).reduce((acc, r) => acc + (r.points_earned ?? 0), 0)

    const enriched = parts.map(p => ({
      ...p,
      match_pts: sum(matchRes.data ?? [], p.id),
      knockout_pts: sum(knockoutRes.data ?? [], p.id),
      special_pts: sum(specialRes.data ?? [], p.id),
    }))

    setParticipants(enriched)
    setLoading(false)
  }

  const maxPts = participants[0]?.total_points ?? 1

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cargando clasificación...</p>
    </div>
  )

  if (!participants.length) return (
    <div style={{ paddingTop: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏆</div>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>La clasificación se actualizará cuando empiece el torneo</p>
    </div>
  )

  const top3 = participants.slice(0, 3)
  const rest = participants.slice(3)

  const medalColors = ['#C9A84C', '#9CA3AF', '#CD7F32']
  const medalEmojis = ['🥇', '🥈', '🥉']

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>

      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>Mundial 2026</div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Clasificación</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{participants.length} participantes</p>
      </div>

      {/* Podio top 3 */}
      {participants.length >= 3 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', alignItems: 'flex-end' }}>
          {[top3[1], top3[0], top3[2]].map((p, visualIdx) => {
            const realIdx = visualIdx === 0 ? 1 : visualIdx === 1 ? 0 : 2
            const isMe = p.id === me
            const height = visualIdx === 1 ? '110px' : visualIdx === 0 ? '85px' : '70px'
            return (
              <div key={p.id} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '22px', fontFamily: "'Noto Color Emoji', sans-serif" }}>{medalEmojis[realIdx]}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: isMe ? '#C9A84C' : '#ffffff', marginTop: '4px' }}>
                    {p.display_name || p.username}
                    {isMe && <span style={{ fontSize: '9px', color: '#C9A84C', marginLeft: '4px' }}>Tú</span>}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: medalColors[realIdx] }}>{p.total_points} pts</div>
                </div>
                <div style={{
                  height, borderRadius: '6px 6px 0 0',
                  background: `linear-gradient(180deg, ${medalColors[realIdx]}30, ${medalColors[realIdx]}10)`,
                  border: `0.5px solid ${medalColors[realIdx]}40`,
                  borderBottom: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 700, color: medalColors[realIdx],
                }}>
                  {realIdx + 1}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lista completa */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {participants.map((p, i) => {
          const isMe = p.id === me
          const isExpanded = expanded === p.id
          const barPct = maxPts > 0 ? Math.round((p.total_points / maxPts) * 100) : 0

          return (
            <div key={p.id}
              onClick={() => setExpanded(isExpanded ? null : p.id)}
              style={{
                background: isMe ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
                border: `0.5px solid ${isMe ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '10px', padding: '12px 16px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                {/* Posición */}
                <div style={{ width: '28px', textAlign: 'center', flexShrink: 0 }}>
                  {i < 3
                    ? <span style={{ fontSize: '16px', fontFamily: "'Noto Color Emoji', sans-serif" }}>{medalEmojis[i]}</span>
                    : <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{i + 1}º</span>}
                </div>

                {/* Nombre */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: isMe ? 600 : 400, color: isMe ? '#C9A84C' : '#ffffff' }}>
                      {p.display_name || p.username}
                    </span>
                    {isMe && <span style={{ fontSize: '9px', color: '#C9A84C', background: 'rgba(201,168,76,0.15)', border: '0.5px solid rgba(201,168,76,0.3)', padding: '1px 5px', borderRadius: '10px' }}>Tú</span>}
                  </div>
                  {/* Barra de progreso */}
                  <div style={{ marginTop: '5px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: isMe ? '#C9A84C' : i === 0 ? 'linear-gradient(90deg, #C9A84C, #C8102E)' : 'rgba(255,255,255,0.2)', borderRadius: '2px', transition: 'width 0.5s' }} />
                  </div>
                </div>

                {/* Puntos */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: isMe ? '#C9A84C' : i === 0 ? '#C9A84C' : '#ffffff' }}>
                    {p.total_points}
                  </div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>pts</div>
                </div>

                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {/* Desglose expandido */}
              {isExpanded && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <ScorePill label="⚽ Grupos" pts={p.match_pts ?? 0} color="#5b8ff9" />
                  <ScorePill label="🏆 Eliminatorias" pts={p.knockout_pts ?? 0} color="#C8102E" />
                  <ScorePill label="🌟 Especiales" pts={p.special_pts ?? 0} color="#C9A84C" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leyenda de puntuación */}
      <div style={{ marginTop: '28px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '14px 18px' }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Sistema de puntuación</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
          <div>⚽ Grupos: <span style={{ color: 'rgba(255,255,255,0.6)' }}>1 pt por 1X2 correcto</span></div>
          <div>🔟 1/16: <span style={{ color: 'rgba(255,255,255,0.6)' }}>2 pts · Octavos: 3 pts · Cuartos: 4 pts</span></div>
          <div>🔥 Semis: <span style={{ color: 'rgba(255,255,255,0.6)' }}>6 pts · Final: 9 pts · Campeón: +12 pts</span></div>
          <div>⚽ Goleador: <span style={{ color: 'rgba(255,255,255,0.6)' }}>1 pt/gol + 1 pt extra si es el máximo</span></div>
          <div>🧤 Portero: <span style={{ color: 'rgba(255,255,255,0.6)' }}>1 pt/portería a 0 (mín 60 min)</span></div>
          <div>🌟 Mejor jugador: <span style={{ color: 'rgba(255,255,255,0.6)' }}>4 pts si acierta</span></div>
        </div>
      </div>
    </div>
  )
}

function ScorePill({ label, pts, color }: { label: string; pts: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: `${color}12`, border: `0.5px solid ${color}30`, borderRadius: '20px', padding: '4px 10px' }}>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 600, color }}>{pts} pts</span>
    </div>
  )
}
