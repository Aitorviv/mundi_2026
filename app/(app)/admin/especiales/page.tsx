'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Participant = { id: string; display_name: string; username: string }
type SpecialBet = {
  participant_id: string
  category: string
  player_name: string
  points_earned: number
  participant?: Participant
}

const CATEGORIES = [
  { key: 'top_scorer',  emoji: '⚽', label: 'Máximo goleador',   desc: '+1 pt por gol marcado' },
  { key: 'goalkeeper',  emoji: '🧤', label: 'Portero',           desc: '+1 pt por portería a 0' },
  { key: 'best_player', emoji: '🌟', label: 'Mejor jugador',     desc: '+4 pts si acierta' },
]

export default function AdminEspecialesPage() {
  const [bets, setBets] = useState<SpecialBet[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('top_scorer')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: betsData } = await supabase
      .from('special_bets')
      .select('participant_id, category, player_name, points_earned')
      .order('category')

    const { data: participants } = await supabase
      .from('participants')
      .select('id, display_name, username')

    if (betsData && participants) {
      const enriched = betsData.map(b => ({
        ...b,
        participant: participants.find(p => p.id === b.participant_id)
      }))
      setBets(enriched)
    }
    setLoading(false)
  }

  async function recalcTotal(participantId: string, newPts: number, category: string) {
    const supabase = createClient()
    // Leer el total actual del participante
    const { data: participant } = await supabase
      .from('participants').select('total_points').eq('id', participantId).single()
    const currentPts = bets.find(b => b.participant_id === participantId && b.category === category)?.points_earned ?? 0
    const diff = newPts - currentPts
    const newTotal = (participant?.total_points ?? 0) + diff
    await supabase.from('participants').update({ total_points: newTotal }).eq('id', participantId)
  }

  async function addPoint(participantId: string, category: string, delta: number) {
    const supabase = createClient()
    const key = `${participantId}-${category}`
    setSaving(key)
    const current = bets.find(b => b.participant_id === participantId && b.category === category)
    const newPts = Math.max(0, (current?.points_earned ?? 0) + delta)
    await supabase.from('special_bets').update({ points_earned: newPts }).eq('participant_id', participantId).eq('category', category)
    await recalcTotal(participantId, newPts, category)
    setBets(prev => prev.map(b => b.participant_id === participantId && b.category === category ? { ...b, points_earned: newPts } : b))
    setSaving(null)
  }

  async function setBestPlayer(participantId: string, isWinner: boolean) {
    const supabase = createClient()
    const pts = isWinner ? 4 : 0
    setSaving(`${participantId}-best_player`)
    await supabase.from('special_bets').update({ points_earned: pts }).eq('participant_id', participantId).eq('category', 'best_player')
    await recalcTotal(participantId, pts, 'best_player')
    setBets(prev => prev.map(b => b.participant_id === participantId && b.category === 'best_player' ? { ...b, points_earned: pts } : b))
    setSaving(null)
  }

  const categoryBets = bets.filter(b => b.category === activeCategory)
  const playerGroups: Record<string, SpecialBet[]> = {}
  categoryBets.forEach(b => {
    const key = b.player_name?.trim().toLowerCase() ?? '—'
    if (!playerGroups[key]) playerGroups[key] = []
    playerGroups[key].push(b)
  })

  const cat = CATEGORIES.find(c => c.key === activeCategory)!

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>Panel administrador</div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Premios individuales</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Asigna puntos manualmente a cada participante</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setActiveCategory(c.key)} style={{
            fontSize: '11px', padding: '10px 16px', background: 'none', border: 'none',
            color: activeCategory === c.key ? '#C9A84C' : 'rgba(255,255,255,0.3)',
            borderBottom: activeCategory === c.key ? '2px solid #C9A84C' : '2px solid transparent',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px', fontFamily: "'Noto Color Emoji', sans-serif" }}>{cat.emoji}</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#ffffff' }}>{cat.label}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{cat.desc}</div>
        </div>
      </div>

      {Object.entries(playerGroups).sort((a, b) => a[0].localeCompare(b[0])).map(([playerKey, playerBets]) => (
        <div key={playerKey} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '2px', textTransform: 'uppercase', background: 'rgba(201,168,76,0.1)', border: '0.5px solid rgba(201,168,76,0.3)', padding: '3px 10px', borderRadius: '20px' }}>
              {playerBets[0].player_name}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{playerBets.length} participante{playerBets.length !== 1 ? 's' : ''}</div>
            {activeCategory !== 'best_player' && (
              <button onClick={async () => { for (const b of playerBets) await addPoint(b.participant_id, activeCategory, 1) }}
                style={{ marginLeft: 'auto', background: 'rgba(201,168,76,0.15)', border: '0.5px solid rgba(201,168,76,0.4)', borderRadius: '6px', padding: '4px 12px', color: '#C9A84C', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                +1 a todos
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {playerBets.map(bet => {
              const key = `${bet.participant_id}-${activeCategory}`
              const isSav = saving === key
              const name = bet.participant?.display_name || bet.participant?.username || '?'

              return (
                <div key={bet.participant_id} style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: 500 }}>{name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                      Apostó: <span style={{ color: '#C9A84C' }}>{bet.player_name}</span>
                    </div>
                  </div>

                  {activeCategory === 'best_player' ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setBestPlayer(bet.participant_id, true)} disabled={isSav} style={{
                        padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                        background: bet.points_earned === 4 ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `0.5px solid ${bet.points_earned === 4 ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        color: bet.points_earned === 4 ? '#C9A84C' : 'rgba(255,255,255,0.4)',
                      }}>✓ 4 pts</button>
                      <button onClick={() => setBestPlayer(bet.participant_id, false)} disabled={isSav} style={{
                        padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                        background: bet.points_earned === 0 ? 'rgba(200,16,46,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `0.5px solid ${bet.points_earned === 0 ? 'rgba(200,16,46,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        color: bet.points_earned === 0 ? '#ff4d6a' : 'rgba(255,255,255,0.4)',
                      }}>✗ 0 pts</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => addPoint(bet.participant_id, activeCategory, -1)} disabled={isSav || bet.points_earned === 0} style={{
                        width: '32px', height: '32px', borderRadius: '6px', fontSize: '18px',
                        background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)', cursor: bet.points_earned === 0 ? 'not-allowed' : 'pointer',
                        opacity: bet.points_earned === 0 ? 0.3 : 1,
                      }}>−</button>
                      <div style={{ textAlign: 'center', minWidth: '48px' }}>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#C9A84C' }}>{isSav ? '...' : bet.points_earned}</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>pts</div>
                      </div>
                      <button onClick={() => addPoint(bet.participant_id, activeCategory, 1)} disabled={isSav} style={{
                        width: '32px', height: '32px', borderRadius: '6px', fontSize: '18px',
                        background: 'rgba(201,168,76,0.15)', border: '0.5px solid rgba(201,168,76,0.4)',
                        color: '#C9A84C', cursor: 'pointer',
                      }}>+</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {categoryBets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
          Ningún participante ha apostado en esta categoría aún
        </div>
      )}
    </div>
  )
}
