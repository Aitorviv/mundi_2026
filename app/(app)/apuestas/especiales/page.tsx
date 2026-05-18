'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { key: 'golden_boot', label: 'Pichichi del Mundial', emoji: '⚽', pts: 5, color: '#C9A84C', desc: 'Máximo goleador del torneo' },
  { key: 'silver_boot', label: 'Bota de Oro',          emoji: '👟', pts: 3, color: '#5b8ff9', desc: 'Mejor jugador del torneo' },
  { key: 'bronze_boot', label: 'Guante de Oro',        emoji: '🧤', pts: 3, color: '#C8102E', desc: 'Mejor portero del torneo' },
]

export default function ApuestasEspecialesPage() {
  const [bets, setBets] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('special_bets')
      .select('category, player_name')
      .eq('participant_id', user.id)

    if (data) {
      const map: Record<string, string> = {}
      data.forEach(b => { if (b.player_name) map[b.category] = b.player_name })
      setBets(map)
    }
    setLoading(false)
  }

  async function saveBet(category: string, playerName: string) {
    if (!playerName.trim()) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(category)
    await supabase.from('special_bets').upsert(
      { participant_id: user.id, category, team_id: null, player_name: playerName.trim() },
      { onConflict: 'participant_id,category' }
    )
    setBets(prev => ({ ...prev, [category]: playerName.trim() }))
    setSaving(null)
    setSaved(category)
    setTimeout(() => setSaved(null), 1500)
  }

  const totalDone = CATEGORIES.filter(c => bets[c.key]?.trim()).length
  const pct = Math.round((totalDone / CATEGORIES.length) * 100)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', background: 'rgba(201,168,76,0.12)', border: '0.5px solid rgba(201,168,76,0.3)', padding: '3px 8px', borderRadius: '20px' }}>
            Premios individuales
          </span>
          <span style={{ fontSize: '9px', color: '#ff4d6a', letterSpacing: '2px', textTransform: 'uppercase', background: 'rgba(200,16,46,0.12)', border: '0.5px solid rgba(200,16,46,0.3)', padding: '3px 8px', borderRadius: '20px' }}>
            Hasta 5 pts
          </span>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Apuestas especiales</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
          {totalDone} / {CATEGORIES.length} completadas
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '50px', textAlign: 'right' }}>{totalDone} / {CATEGORIES.length}</span>
        </div>
      </div>

      {/* Categorías */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {CATEGORIES.map(cat => {
          const value = bets[cat.key] ?? ''
          const isSav = saving === cat.key
          const isSaved = saved === cat.key

          return (
            <div key={cat.key} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${cat.color}`,
              borderRadius: '12px',
              padding: '18px 20px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px', fontFamily: "'Noto Color Emoji', sans-serif", lineHeight: 1 }}>{cat.emoji}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff', marginBottom: '2px' }}>{cat.label}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{cat.desc}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: cat.color, background: `${cat.color}20`, border: `0.5px solid ${cat.color}40`, padding: '3px 8px', borderRadius: '20px' }}>
                    {cat.pts} pts
                  </span>
                  <div style={{ width: '18px', textAlign: 'center', fontSize: '13px' }}>
                    {isSav ? <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>...</span>
                      : isSaved ? <span style={{ color: '#C9A84C' }}>✓</span>
                      : value ? <span style={{ color: 'rgba(201,168,76,0.5)' }}>✓</span>
                      : null}
                  </div>
                </div>
              </div>

              {/* Input */}
              <input
                type="text"
                placeholder={`Escribe el nombre del jugador...`}
                value={value}
                onChange={e => setBets(prev => ({ ...prev, [cat.key]: e.target.value }))}
                onBlur={e => saveBet(cat.key, e.target.value)}
                style={{
                  width: '100%',
                  background: value ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                  border: `0.5px solid ${value ? cat.color + '60' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '8px',
                  padding: '11px 14px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
              />

              {value && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: cat.color }}>
                  Tu apuesta: {value}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px', marginTop: '24px' }}>
        Se guarda automáticamente al salir del campo
      </div>
    </div>
  )
}
