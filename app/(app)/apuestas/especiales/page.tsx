'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isBettingOpen } from '@/lib/deadline'
import DeadlineCountdown from '@/components/DeadlineCountdown'

const CATEGORIES = [
  {
    key: 'top_scorer',
    emoji: '⚽',
    title: 'Máximo goleador',
    desc: 'El jugador que más goles marcará en el torneo',
    pts: '1 pt por gol marcado + 1 pt extra si es el máximo goleador',
    color: '#C9A84C',
    placeholder: 'Ej: Kylian Mbappé',
  },
  {
    key: 'goalkeeper',
    emoji: '🧤',
    title: 'Portero con más porterías a 0',
    desc: 'Mínimo 60 minutos jugados · no cuenta prórroga',
    pts: '1 pt por cada portería a 0',
    color: '#5b8ff9',
    placeholder: 'Ej: Thibaut Courtois',
  },
  {
    key: 'best_player',
    emoji: '🌟',
    title: 'Mejor jugador del torneo',
    desc: 'El que recibirá el Balón de Oro del Mundial',
    pts: '4 pts si acierta',
    color: '#C8102E',
    placeholder: 'Ej: Vinicius Jr.',
  },
]

export default function ApuestasEspecialesPage() {
  const [bets, setBets] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const bettingOpen = isBettingOpen()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()
    if (!session?.id) { setLoading(false); return }

    const { data } = await supabase
      .from('special_bets')
      .select('category, player_name')
      .eq('participant_id', session.id)

    if (data) {
      const map: Record<string, string> = {}
      data.forEach(b => { if (b.player_name) map[b.category] = b.player_name })
      setBets(map)
    }
    setLoading(false)
  }

  async function saveBet(category: string, playerName: string) {
    if (!bettingOpen) return
    const trimmed = playerName.trim()
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()
    if (!session?.id) return

    if (!trimmed) {
      // Borrar si está vacío
      await supabase.from('special_bets').delete()
        .eq('participant_id', session.id).eq('category', category)
      setBets(prev => { const n = { ...prev }; delete n[category]; return n })
      return
    }

    await supabase.from('special_bets').upsert(
      { participant_id: session.id, category, player_name: trimmed },
      { onConflict: 'participant_id,category' }
    )
    setBets(prev => ({ ...prev, [category]: trimmed }))
    setSaved(prev => ({ ...prev, [category]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [category]: false })), 2000)
  }

  const totalDone = CATEGORIES.filter(c => bets[c.key]?.trim()).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      <DeadlineCountdown />

      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', background: 'rgba(201,168,76,0.12)', border: '0.5px solid rgba(201,168,76,0.3)', padding: '3px 8px', borderRadius: '20px' }}>Apuestas especiales</span>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Premios individuales</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>{totalDone} / {CATEGORIES.length} completadas</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((totalDone/CATEGORIES.length)*100)}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '30px', textAlign: 'right' }}>{totalDone}/3</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {CATEGORIES.map(cat => {
          const value = bets[cat.key] ?? ''
          const isSaved = saved[cat.key]

          return (
            <div key={cat.key} style={{
              background: 'rgba(255,255,255,0.02)',
              border: `0.5px solid ${value ? `${cat.color}30` : 'rgba(255,255,255,0.06)'}`,
              borderLeft: `3px solid ${cat.color}`,
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              {/* Cabecera */}
              <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px', fontFamily: "'Noto Color Emoji', sans-serif", lineHeight: 1 }}>{cat.emoji}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>{cat.title}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>{cat.desc}</div>
                    <div style={{ fontSize: '10px', color: cat.color, background: `${cat.color}15`, border: `0.5px solid ${cat.color}40`, padding: '2px 8px', borderRadius: '20px', display: 'inline-block' }}>{cat.pts}</div>
                  </div>
                </div>
                <div style={{ fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>
                  {!bettingOpen ? '🔒'
                    : isSaved ? <span style={{ color: '#C9A84C' }}>✓</span>
                    : value ? <span style={{ color: cat.color, opacity: 0.6 }}>✓</span>
                    : null}
                </div>
              </div>

              {/* Input */}
              <div style={{ padding: '0 20px 16px' }}>
                <input
                  type="text"
                  placeholder={bettingOpen ? cat.placeholder : 'Apuestas cerradas'}
                  disabled={!bettingOpen}
                  value={value}
                  onChange={e => setBets(prev => ({ ...prev, [cat.key]: e.target.value }))}
                  onBlur={e => saveBet(cat.key, e.target.value)}
                  style={{
                    width: '100%',
                    background: value ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                    border: `0.5px solid ${value ? `${cat.color}50` : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '8px',
                    padding: '11px 14px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: !bettingOpen ? 0.5 : 1,
                    cursor: !bettingOpen ? 'not-allowed' : 'text',
                    transition: 'border-color 0.2s',
                  }}
                />
                {value && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: cat.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Tu apuesta:</span>
                    <span style={{ fontWeight: 500 }}>{value}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Resumen de puntuación */}
      <div style={{ marginTop: '24px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px 20px' }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Cómo se puntúa</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontFamily: "'Noto Color Emoji', sans-serif" }}>⚽</span>
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Máximo goleador</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>1 pt por cada gol del jugador apostado + 1 pt extra si es el máximo goleador del torneo</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontFamily: "'Noto Color Emoji', sans-serif" }}>🧤</span>
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Portero</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>1 pt por cada portería a 0 del portero apostado (mín 60 min, sin prórroga)</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontFamily: "'Noto Color Emoji', sans-serif" }}>🌟</span>
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Mejor jugador</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>4 pts si el jugador apostado gana el Balón de Oro del torneo</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px', marginTop: '16px' }}>
        {bettingOpen ? 'Se guarda automáticamente al salir del campo · borra el texto para eliminar la apuesta' : 'Las apuestas están cerradas'}
      </div>
    </div>
  )
}
