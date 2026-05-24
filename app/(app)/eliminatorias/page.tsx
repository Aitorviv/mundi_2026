'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Team = { id: number; name: string; flag_emoji: string }
type Match = {
  id: number
  match_number: number
  phase: string
  home_team_id: number | null
  away_team_id: number | null
  home_goals: number | null
  away_goals: number | null
  played_at: string
  home_team?: Team
  away_team?: Team
}
type Bet = { match_id: number; home_goals_bet: number; away_goals_bet: number }

const PHASES = [
  { key: 'r32',   label: '1/16',      nums: Array.from({length:16}, (_,i) => 73+i) },
  { key: 'r16',   label: 'Octavos',   nums: Array.from({length:8},  (_,i) => 89+i) },
  { key: 'qf',    label: 'Cuartos',   nums: [97,98,99,100] },
  { key: 'sf',    label: 'Semis',     nums: [101,102] },
  { key: '3rd',   label: '3º-4º',     nums: [103] },
  { key: 'final', label: 'Final',     nums: [104] },
]

export default function EliminatoriasPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<number, Bet>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState('r32')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: matchesData } = await supabase
      .from('matches')
      .select(`id, match_number, phase, home_team_id, away_team_id, home_goals, away_goals, played_at,
        home_team:home_team_id(id, name, flag_emoji),
        away_team:away_team_id(id, name, flag_emoji)`)
      .in('phase', ['r32','r16','qf','sf','3rd','final'])
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
    setSaving(null); setSaved(matchId)
    setTimeout(() => setSaved(null), 1500)
  }

  function isLocked(playedAt: string) { return new Date(playedAt) < new Date() }

  const activePhaseData = PHASES.find(p => p.key === activePhase)!
  const phaseMatches = matches.filter(m => m.phase === activePhase)
  const totalBets = Object.keys(bets).length
  const totalMatches = matches.length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cargando eliminatorias...</p>
    </div>
  )

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', background: 'rgba(200,16,46,0.12)', border: '0.5px solid rgba(200,16,46,0.3)', padding: '3px 8px', borderRadius: '20px' }}>
            Fase eliminatoria
          </span>
          <span style={{ fontSize: '9px', color: '#5b8ff9', letterSpacing: '2px', textTransform: 'uppercase', background: 'rgba(26,86,196,0.12)', border: '0.5px solid rgba(26,86,196,0.3)', padding: '3px 8px', borderRadius: '20px' }}>
            3 pts exacto · 1 pt ganador
          </span>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Eliminatorias</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
          {totalBets} / {totalMatches} partidos apostados
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${totalMatches ? Math.round((totalBets/totalMatches)*100) : 0}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '50px', textAlign: 'right' }}>{totalBets} / {totalMatches}</span>
        </div>
      </div>

      {/* Tabs de fase */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '0.5px solid rgba(255,255,255,0.05)', marginBottom: '24px', gap: '0' }}>
        {PHASES.map(phase => {
          const phaseMs = matches.filter(m => m.phase === phase.key)
          const phaseBets = phaseMs.filter(m => bets[m.id]).length
          const complete = phaseMs.length > 0 && phaseBets === phaseMs.length
          return (
            <button key={phase.key} onClick={() => setActivePhase(phase.key)} style={{
              fontSize: '10px', whiteSpace: 'nowrap',
              color: activePhase === phase.key ? '#C9A84C' : complete ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.28)',
              padding: '10px 14px',
              letterSpacing: '0.5px', textTransform: 'uppercase',
              background: 'none', border: 'none',
              borderBottom: activePhase === phase.key ? '2px solid #C9A84C' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {phase.label}
              {complete && <span style={{ marginLeft: '4px', color: '#C9A84C' }}>✓</span>}
            </button>
          )
        })}
      </div>

      {/* Partidos de la fase activa */}
      {phaseMatches.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '0.5px solid rgba(255,255,255,0.06)',
          borderRadius: '12px', padding: '32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', fontFamily: "'Noto Color Emoji', sans-serif" }}>⏳</div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Los equipos de {activePhaseData.label} se conocerán cuando termine la fase anterior
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
            Podrás apostar en cuanto el admin asigne los equipos
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {phaseMatches.map((match, idx) => {
            const bet = bets[match.id]
            const locked = isLocked(match.played_at)
            const hasTeams = match.home_team && match.away_team
            const isSaving = saving === match.id
            const isSaved = saved === match.id

            return (
              <MatchCard
                key={match.id}
                match={match}
                bet={bet}
                locked={locked}
                hasTeams={!!hasTeams}
                isSaving={isSaving}
                isSaved={isSaved}
                index={idx + 1}
                onSave={saveBet}
              />
            )
          })}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px', marginTop: '20px' }}>
        Se guarda automáticamente · los equipos aparecen cuando el admin los asigne
      </div>
    </div>
  )
}

function MatchCard({ match, bet, locked, hasTeams, isSaving, isSaved, index, onSave }: {
  match: Match; bet?: Bet; locked: boolean; hasTeams: boolean
  isSaving: boolean; isSaved: boolean; index: number
  onSave: (id: number, h: number, a: number) => void
}) {
  const [home, setHome] = useState<number | ''>(bet?.home_goals_bet ?? '')
  const [away, setAway] = useState<number | ''>(bet?.away_goals_bet ?? '')

  useEffect(() => {
    if (bet) { setHome(bet.home_goals_bet); setAway(bet.away_goals_bet) }
  }, [bet])

  const date = new Date(match.played_at).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric',
    month: 'short', hour: '2-digit', minute: '2-digit',
  })

  const inputStyle = (filled: boolean): React.CSSProperties => ({
    width: '38px', height: '36px',
    background: filled ? 'rgba(26,86,196,0.1)' : 'rgba(255,255,255,0.04)',
    border: `0.5px solid ${filled ? 'rgba(26,86,196,0.5)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: '6px', color: filled ? '#5b8ff9' : '#ffffff',
    fontSize: '16px', fontWeight: 500, textAlign: 'center', outline: 'none',
    opacity: locked || !hasTeams ? 0.4 : 1,
    cursor: locked || !hasTeams ? 'not-allowed' : 'text',
  })

  const phaseLabel: Record<string, string> = {
    r32: '1/16', r16: '1/8', qf: '1/4', sf: 'SF', '3rd': '3º-4º', final: '🏆'
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `0.5px solid ${isSaved ? 'rgba(201,168,76,0.4)' : bet ? 'rgba(26,86,196,0.2)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: '10px', padding: '12px 16px',
      transition: 'border-color 0.2s',
    }}>
      {/* Header del partido */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C8102E', background: 'rgba(200,16,46,0.15)', border: '0.5px solid rgba(200,16,46,0.3)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '1px' }}>
            {phaseLabel[match.phase]} · P{match.match_number}
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px' }}>{date}</span>
        </div>
        <div style={{ fontSize: '11px' }}>
          {locked ? '🔒' : isSaving ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>...</span>
            : isSaved ? <span style={{ color: '#C9A84C' }}>✓</span>
            : bet ? <span style={{ color: 'rgba(26,86,196,0.7)' }}>✓</span>
            : null}
        </div>
      </div>

      {/* Equipos y marcador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Local */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, justifyContent: 'flex-end' }}>
          {match.home_team ? (
            <>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', textAlign: 'right' }}>{match.home_team.name}</span>
              <span className="flag-emoji" style={{ fontSize: '18px', lineHeight: 1 }}>{match.home_team.flag_emoji}</span>
            </>
          ) : (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Por determinar</span>
          )}
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <input type="number" min="0" max="20"
            disabled={locked || !hasTeams} value={home}
            onChange={e => setHome(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => { if (home !== '' && away !== '' && !locked && hasTeams) onSave(match.id, Number(home), Number(away)) }}
            style={inputStyle(home !== '')}
          />
          <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '14px' }}>–</span>
          <input type="number" min="0" max="20"
            disabled={locked || !hasTeams} value={away}
            onChange={e => setAway(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => { if (home !== '' && away !== '' && !locked && hasTeams) onSave(match.id, Number(home), Number(away)) }}
            style={inputStyle(away !== '')}
          />
        </div>

        {/* Visitante */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1 }}>
          {match.away_team ? (
            <>
              <span className="flag-emoji" style={{ fontSize: '18px', lineHeight: 1 }}>{match.away_team.flag_emoji}</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{match.away_team.name}</span>
            </>
          ) : (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Por determinar</span>
          )}
        </div>
      </div>

      {/* Resultado real si existe */}
      {match.home_goals !== null && match.away_goals !== null && (
        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
          Resultado: {match.home_goals} – {match.away_goals}
          {bet && (
            <span style={{ marginLeft: '8px', color: bet.home_goals_bet === match.home_goals && bet.away_goals_bet === match.away_goals ? '#C9A84C' : Math.sign(bet.home_goals_bet - bet.away_goals_bet) === Math.sign(match.home_goals - match.away_goals) ? '#5b8ff9' : 'rgba(255,255,255,0.2)' }}>
              · Tu apuesta: {bet.home_goals_bet}–{bet.away_goals_bet}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
