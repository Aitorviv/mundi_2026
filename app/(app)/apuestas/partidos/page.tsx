'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Match = {
  id: number
  match_number: number
  group_name: string
  matchday: number
  played_at: string
  locked_at: string
  home_team: { id: number; name: string; flag_emoji: string }
  away_team: { id: number; name: string; flag_emoji: string }
}

type Bet = {
  match_id: number
  home_goals_bet: number
  away_goals_bet: number
}

export default function ApuestasPartidosPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<number, Bet>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeMatchday, setActiveMatchday] = useState(1)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: matchesData } = await supabase
      .from('matches')
      .select('id, match_number, group_name, matchday, played_at, locked_at, home_team:home_team_id(id, name, flag_emoji), away_team:away_team_id(id, name, flag_emoji)')
      .eq('phase', 'group')
      .order('match_number')

    const { data: betsData } = await supabase
      .from('match_bets')
      .select('match_id, home_goals_bet, away_goals_bet')
      .eq('participant_id', user.id)

    if (matchesData) setMatches(matchesData as unknown as Match[])
    if (betsData) {
      const map: Record<number, Bet> = {}
      betsData.forEach(b => { map[b.match_id] = b })
      setBets(map)
    }
    setLoading(false)
  }

  async function saveBet(matchId: number, home: number, away: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(matchId)
    await supabase.from('match_bets').upsert(
      { participant_id: user.id, match_id: matchId, home_goals_bet: home, away_goals_bet: away },
      { onConflict: 'participant_id,match_id' }
    )
    setBets(prev => ({ ...prev, [matchId]: { match_id: matchId, home_goals_bet: home, away_goals_bet: away } }))
    setSaving(null)
    setSaved(matchId)
    setTimeout(() => setSaved(null), 1500)
  }

  function isLocked(lockedAt: string) { return new Date(lockedAt) < new Date() }

  const filtered = matches.filter(m => m.matchday === activeMatchday)
  const groups = [...new Set(filtered.map(m => m.group_name))].sort()
  const totalBets = Object.keys(bets).length
  const totalMatches = matches.length
  const pct = totalMatches ? Math.round((totalBets / totalMatches) * 100) : 0

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cargando partidos...</p>
    </div>
  )

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      {/* Cabecera */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', background: 'rgba(200,16,46,0.12)', border: '0.5px solid rgba(200,16,46,0.3)', padding: '3px 8px', borderRadius: '20px' }}>Fase de grupos</span>
          <span style={{ fontSize: '9px', color: '#5b8ff9', letterSpacing: '2px', textTransform: 'uppercase', background: 'rgba(26,86,196,0.12)', border: '0.5px solid rgba(26,86,196,0.3)', padding: '3px 8px', borderRadius: '20px' }}>3 pts · resultado exacto</span>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Resultados de partidos</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '50px', textAlign: 'right' }}>{totalBets} / {totalMatches}</span>
        </div>
      </div>

      {/* Tabs jornada */}
      <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        {[1, 2, 3].map(j => (
          <button
            key={j}
            onClick={() => setActiveMatchday(j)}
            style={{
              fontSize: '10px',
              color: activeMatchday === j ? '#C9A84C' : 'rgba(255,255,255,0.28)',
              padding: '10px 16px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              background: 'none',
              border: 'none',
              borderBottom: activeMatchday === j ? '2px solid #C9A84C' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Jornada {j}
          </button>
        ))}
      </div>

      {/* Partidos por grupo */}
      {groups.map(group => (
        <div key={group} style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '9px', fontWeight: 500, color: '#5b8ff9', letterSpacing: '3px', textTransform: 'uppercase', padding: '0 0 6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Grupo {group}
            <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(26,86,196,0.3), transparent)' }} />
          </div>
          <div>
            {filtered.filter(m => m.group_name === group).map(match => (
              <MatchRow
                key={match.id}
                match={match}
                bet={bets[match.id]}
                locked={isLocked(match.locked_at)}
                isSaving={saving === match.id}
                isSaved={saved === match.id}
                onSave={saveBet}
              />
            ))}
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px', marginTop: '16px' }}>
        Se guarda automáticamente al salir del campo
      </div>
    </div>
  )
}

function MatchRow({ match, bet, locked, isSaving, isSaved, onSave }: {
  match: Match; bet?: Bet; locked: boolean; isSaving: boolean; isSaved: boolean
  onSave: (id: number, h: number, a: number) => void
}) {
  const [home, setHome] = useState<number | ''>(bet?.home_goals_bet ?? '')
  const [away, setAway] = useState<number | ''>(bet?.away_goals_bet ?? '')

  useEffect(() => {
    if (bet) { setHome(bet.home_goals_bet); setAway(bet.away_goals_bet) }
  }, [bet])

  const date = new Date(match.played_at).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  const inputStyle = (filled: boolean): React.CSSProperties => ({
    width: '36px', height: '34px',
    background: filled ? 'rgba(26,86,196,0.1)' : 'rgba(255,255,255,0.04)',
    border: `0.5px solid ${filled ? 'rgba(26,86,196,0.5)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: '6px',
    color: filled ? '#5b8ff9' : '#ffffff',
    fontSize: '15px', fontWeight: 500,
    textAlign: 'center', outline: 'none',
    opacity: locked ? 0.4 : 1,
    cursor: locked ? 'not-allowed' : 'text',
  })

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 0',
        borderBottom: '0.5px solid rgba(255,255,255,0.03)',
      }}>
        {/* Local */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)' }} className="hidden sm:block">{match.home_team.name}</span>
          <span className="flag-emoji" style={{ fontSize: '17px', lineHeight: 1 }}>{match.home_team.flag_emoji}</span>
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <input type="number" min="0" max="20" disabled={locked} value={home}
            onChange={e => setHome(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => { if (home !== '' && away !== '' && !locked) onSave(match.id, Number(home), Number(away)) }}
            style={inputStyle(home !== '')}
          />
          <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '13px' }}>–</span>
          <input type="number" min="0" max="20" disabled={locked} value={away}
            onChange={e => setAway(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => { if (home !== '' && away !== '' && !locked) onSave(match.id, Number(home), Number(away)) }}
            style={inputStyle(away !== '')}
          />
        </div>

        {/* Visitante */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1 }}>
          <span className="flag-emoji" style={{ fontSize: '17px', lineHeight: 1 }}>{match.away_team.flag_emoji}</span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)' }} className="hidden sm:block">{match.away_team.name}</span>
        </div>

        {/* Estado */}
        <div style={{ width: '18px', textAlign: 'center', fontSize: '11px', flexShrink: 0 }}>
          {locked ? '🔒' : isSaving ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>...</span> : isSaved ? <span style={{ color: '#C9A84C' }}>✓</span> : bet ? <span style={{ color: 'rgba(26,86,196,0.7)' }}>✓</span> : null}
        </div>
      </div>
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.14)', textAlign: 'center', padding: '2px 0 6px', letterSpacing: '0.5px' }}>{date}</div>
    </>
  )
}
