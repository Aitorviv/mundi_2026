'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Team = { id: number; name: string; flag_emoji: string }

const TEAM_CATEGORIES = [
  { key: 'champion',  label: 'Campeón',    emoji: '🥇', pts: 10, color: '#C9A84C' },
  { key: 'runner_up', label: 'Subcampeón', emoji: '🥈', pts: 6,  color: '#5b8ff9' },
  { key: 'third',     label: '3er puesto', emoji: '🥉', pts: 4,  color: '#C8102E' },
]

const PLAYER_CATEGORIES = [
  { key: 'golden_boot',  label: 'Bota de Oro',     emoji: '👟', pts: 5, color: '#C9A84C' },
  { key: 'silver_boot',  label: 'Bota de Plata',   emoji: '👟', pts: 3, color: '#5b8ff9' },
  { key: 'bronze_boot',  label: 'Bota de Bronce',  emoji: '👟', pts: 2, color: '#C8102E' },
  { key: 'golden_ball',  label: 'Balón de Oro',    emoji: '⚽', pts: 5, color: '#C9A84C' },
  { key: 'silver_ball',  label: 'Balón de Plata',  emoji: '⚽', pts: 3, color: '#5b8ff9' },
  { key: 'bronze_ball',  label: 'Balón de Bronce', emoji: '⚽', pts: 2, color: '#C8102E' },
]

export default function ApuestasEspecialesPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamBets, setTeamBets] = useState<Record<string, number>>({})
  const [playerBets, setPlayerBets] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: teamsData } = await supabase
      .from('teams').select('id, name, flag_emoji').order('name')

    const { data: betsData } = await supabase
      .from('special_bets').select('category, team_id, player_name').eq('participant_id', user.id)

    if (teamsData) setTeams(teamsData)
    if (betsData) {
      const tBets: Record<string, number> = {}
      const pBets: Record<string, string> = {}
      betsData.forEach(b => {
        if (b.team_id) tBets[b.category] = b.team_id
        if (b.player_name) pBets[b.category] = b.player_name
      })
      setTeamBets(tBets)
      setPlayerBets(pBets)
    }
    setLoading(false)
  }

  async function saveTeamBet(category: string, teamId: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(category)
    await supabase.from('special_bets').upsert(
      { participant_id: user.id, category, team_id: teamId, player_name: null },
      { onConflict: 'participant_id,category' }
    )
    setTeamBets(prev => ({ ...prev, [category]: teamId }))
    setSaving(null); setSaved(category)
    setTimeout(() => setSaved(null), 1200)
  }

  async function savePlayerBet(category: string, playerName: string) {
    if (!playerName.trim()) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(category)
    await supabase.from('special_bets').upsert(
      { participant_id: user.id, category, team_id: null, player_name: playerName.trim() },
      { onConflict: 'participant_id,category' }
    )
    setPlayerBets(prev => ({ ...prev, [category]: playerName.trim() }))
    setSaving(null); setSaved(category)
    setTimeout(() => setSaved(null), 1200)
  }

  const totalDone = TEAM_CATEGORIES.filter(c => teamBets[c.key]).length +
    PLAYER_CATEGORIES.filter(c => playerBets[c.key]?.trim()).length
  const totalAll = TEAM_CATEGORIES.length + PLAYER_CATEGORIES.length
  const pct = Math.round((totalDone / totalAll) * 100)
  const filteredTeams = search ? teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : teams

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', background: 'rgba(201,168,76,0.12)', border: '0.5px solid rgba(201,168,76,0.3)', padding: '3px 8px', borderRadius: '20px' }}>
            Apuestas especiales
          </span>
          <span style={{ fontSize: '9px', color: '#ff4d6a', letterSpacing: '2px', textTransform: 'uppercase', background: 'rgba(200,16,46,0.12)', border: '0.5px solid rgba(200,16,46,0.3)', padding: '3px 8px', borderRadius: '20px' }}>
            Hasta 10 pts
          </span>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Apuestas especiales</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>{totalDone} / {totalAll} completadas</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '50px', textAlign: 'right' }}>{totalDone} / {totalAll}</span>
        </div>
      </div>

      {/* PODIO */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Podio final
          <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' }} />
        </div>

        <input
          type="text"
          placeholder="Buscar equipo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', marginBottom: '12px',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '10px 14px',
            color: '#ffffff', fontSize: '13px', outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {TEAM_CATEGORIES.map(cat => {
            const selectedId = teamBets[cat.key]
            const selectedTeam = teams.find(t => t.id === selectedId)
            const isSav = saving === cat.key
            const isSaved = saved === cat.key

            return (
              <div key={cat.key} style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${cat.color}`, borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px', fontFamily: "'Noto Color Emoji', sans-serif" }}>{cat.emoji}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#ffffff' }}>{cat.label}</div>
                      <div style={{ fontSize: '10px', color: cat.color }}>{cat.pts} puntos</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedTeam && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="flag-emoji" style={{ fontSize: '15px' }}>{selectedTeam.flag_emoji}</span>
                        <span style={{ fontSize: '12px', color: cat.color }}>{selectedTeam.name}</span>
                      </div>
                    )}
                    {isSav ? <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>...</span>
                      : isSaved ? <span style={{ fontSize: '11px', color: '#C9A84C' }}>✓</span>
                      : selectedTeam ? <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.5)' }}>✓</span>
                      : null}
                  </div>
                </div>
                <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                  {filteredTeams.map(team => {
                    const isSelected = selectedId === team.id
                    return (
                      <button key={team.id} onClick={() => saveTeamBet(cat.key, team.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '5px 9px', borderRadius: '6px',
                        background: isSelected ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                        border: isSelected ? `0.5px solid ${cat.color}` : '0.5px solid rgba(255,255,255,0.06)',
                        color: isSelected ? cat.color : 'rgba(255,255,255,0.6)',
                        fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        <span className="flag-emoji" style={{ fontSize: '13px', lineHeight: 1 }}>{team.flag_emoji}</span>
                        <span>{team.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PREMIOS INDIVIDUALES */}
      <div>
        <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Premios individuales
          <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PLAYER_CATEGORIES.map(cat => {
            const value = playerBets[cat.key] ?? ''
            const isSav = saving === cat.key
            const isSaved = saved === cat.key

            return (
              <div key={cat.key} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${cat.color}`,
                borderRadius: '10px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <span style={{ fontSize: '18px', fontFamily: "'Noto Color Emoji', sans-serif", flexShrink: 0 }}>{cat.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: cat.color, letterSpacing: '0.5px', marginBottom: '6px' }}>
                    {cat.label} · {cat.pts} pts
                  </div>
                  <input
                    type="text"
                    placeholder="Nombre del jugador..."
                    value={value}
                    onChange={e => setPlayerBets(prev => ({ ...prev, [cat.key]: e.target.value }))}
                    onBlur={e => savePlayerBet(cat.key, e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.04)',
                      border: `0.5px solid ${value ? cat.color + '80' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '6px', padding: '7px 10px',
                      color: '#ffffff', fontSize: '13px', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ width: '18px', textAlign: 'center', fontSize: '11px', flexShrink: 0 }}>
                  {isSav ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>...</span>
                    : isSaved ? <span style={{ color: '#C9A84C' }}>✓</span>
                    : value ? <span style={{ color: 'rgba(201,168,76,0.5)' }}>✓</span>
                    : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px', marginTop: '20px' }}>
        Podio: clic en el equipo · Jugadores: escribe el nombre y sal del campo
      </div>
    </div>
  )
}
