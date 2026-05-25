'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isBettingOpen } from '@/lib/deadline'
import DeadlineCountdown from '@/components/DeadlineCountdown'

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
  { key: 'r32',   label: '1/16'    },
  { key: 'r16',   label: 'Octavos' },
  { key: 'qf',    label: 'Cuartos' },
  { key: 'sf',    label: 'Semis'   },
  { key: '3rd',   label: '3º-4º'   },
  { key: 'final', label: 'Final'   },
]

const PHASE_LABEL: Record<string, string> = {
  r32: '1/16', r16: '1/8', qf: '1/4', sf: 'SF', '3rd': '3º-4º', final: '🏆'
}

export default function EliminatoriasPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<number, Bet>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState('r32')
  const bettingOpen = isBettingOpen()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()

    const { data: matchesData } = await supabase
      .from('matches')
      .select(`id, match_number, phase, home_team_id, away_team_id, home_goals, away_goals, played_at,
        home_team:home_team_id(id, name, flag_emoji),
        away_team:away_team_id(id, name, flag_emoji)`)
      .in('phase', ['r32','r16','qf','sf','3rd','final'])
      .order('match_number')

    if (session?.id) {
      const { data: betsData } = await supabase
        .from('match_bets')
        .select('match_id, home_goals_bet, away_goals_bet')
        .eq('participant_id', session.id)

      if (betsData) {
        const map: Record<number, Bet> = {}
        betsData.forEach(b => { map[b.match_id] = b })
        setBets(map)
      }
    }

    if (matchesData) setMatches(matchesData as unknown as Match[])
    setLoading(false)
  }

  async function saveBet(matchId: number, home: number, away: number) {
    if (!bettingOpen) return
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()
    if (!session?.id) return
    setSaving(matchId)
    await supabase.from('match_bets').upsert(
      { participant_id: session.id, match_id: matchId, home_goals_bet: home, away_goals_bet: away },
      { onConflict: 'participant_id,match_id' }
    )
    setBets(prev => ({ ...prev, [matchId]: { match_id: matchId, home_goals_bet: home, away_goals_bet: away } }))
    setSaving(null); setSaved(matchId)
    setTimeout(() => setSaved(null), 1500)
  }

  async function deleteBet(matchId: number) {
    if (!bettingOpen) return
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()
    if (!session?.id) return
    await supabase.from('match_bets').delete().eq('participant_id', session.id).eq('match_id', matchId)
    setBets(prev => { const n = { ...prev }; delete n[matchId]; return n })
  }

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
      <DeadlineCountdown />

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', background: 'rgba(200,16,46,0.12)', border: '0.5px solid rgba(200,16,46,0.3)', padding: '3px 8px', borderRadius: '20px' }}>Fase eliminatoria</span>
          <span style={{ fontSize: '9px', color: '#5b8ff9', letterSpacing: '2px', textTransform: 'uppercase', background: 'rgba(26,86,196,0.12)', border: '0.5px solid rgba(26,86,196,0.3)', padding: '3px 8px', borderRadius: '20px' }}>3 pts exacto · 1 pt ganador</span>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Eliminatorias</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>{totalBets} / {totalMatches} partidos apostados</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${totalMatches ? Math.round((totalBets/totalMatches)*100) : 0}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '50px', textAlign: 'right' }}>{totalBets} / {totalMatches}</span>
        </div>
      </div>

      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '0.5px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
        {PHASES.map(phase => {
          const phaseMs = matches.filter(m => m.phase === phase.key)
          const phaseBets = phaseMs.filter(m => bets[m.id]).length
          const complete = phaseMs.length > 0 && phaseBets === phaseMs.length
          return (
            <button key={phase.key} onClick={() => setActivePhase(phase.key)} style={{
              fontSize: '10px', whiteSpace: 'nowrap',
              color: activePhase === phase.key ? '#C9A84C' : complete ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.28)',
              padding: '10px 14px', letterSpacing: '0.5px', textTransform: 'uppercase',
              background: 'none', border: 'none',
              borderBottom: activePhase === phase.key ? '2px solid #C9A84C' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {phase.label}{complete && ' ✓'}
            </button>
          )
        })}
      </div>

      {phaseMatches.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Los equipos de {PHASES.find(p => p.key === activePhase)?.label} se conocerán cuando termine la fase anterior
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
            Podrás apostar en cuanto el admin asigne los equipos
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {phaseMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              bet={bets[match.id]}
              locked={!bettingOpen}
              isSaving={saving === match.id}
              isSaved={saved === match.id}
              phaseLabel={PHASE_LABEL[match.phase]}
              onSave={saveBet}
              onDelete={deleteBet}
            />
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px', marginTop: '20px' }}>
        {bettingOpen ? 'Se guarda automáticamente · los equipos aparecen cuando el admin los asigne' : 'Las apuestas están cerradas'}
      </div>
    </div>
  )
}

function MatchCard({ match, bet, locked, isSaving, isSaved, phaseLabel, onSave, onDelete }: {
  match: Match; bet?: Bet; locked: boolean
  isSaving: boolean; isSaved: boolean; phaseLabel: string
  onSave: (id: number, h: number, a: number) => void
  onDelete: (id: number) => void
}) {
  const [home, setHome] = useState<number | ''>(bet?.home_goals_bet ?? '')
  const [away, setAway] = useState<number | ''>(bet?.away_goals_bet ?? '')
  const hasTeams = !!(match.home_team && match.away_team)

  useEffect(() => {
    if (bet) { setHome(bet.home_goals_bet); setAway(bet.away_goals_bet) }
    else { setHome(''); setAway('') }
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

  const realResult = match.home_goals !== null && match.away_goals !== null
  const exactMatch = bet && realResult && bet.home_goals_bet === match.home_goals && bet.away_goals_bet === match.away_goals
  const correctWinner = bet && realResult && !exactMatch && Math.sign(bet.home_goals_bet - bet.away_goals_bet) === Math.sign(match.home_goals! - match.away_goals!)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `0.5px solid ${isSaved ? 'rgba(201,168,76,0.4)' : bet ? 'rgba(26,86,196,0.2)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: '10px', padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C8102E', background: 'rgba(200,16,46,0.15)', border: '0.5px solid rgba(200,16,46,0.3)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '1px' }}>
            {phaseLabel} · P{match.match_number}
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>{date}</span>
        </div>
        <div style={{ fontSize: '11px' }}>
          {locked ? <span>🔒</span>
            : isSaving ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>...</span>
            : isSaved ? <span style={{ color: '#C9A84C' }}>✓</span>
            : bet ? (
              <button onClick={() => onDelete(match.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,16,46,0.5)', fontSize: '13px', padding: '2px' }}>✕</button>
            ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <input type="number" min="0" max="20" disabled={locked || !hasTeams} value={home}
            onChange={e => setHome(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => { if (home !== '' && away !== '' && !locked && hasTeams) onSave(match.id, Number(home), Number(away)) }}
            style={inputStyle(home !== '')}
          />
          <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '14px' }}>–</span>
          <input type="number" min="0" max="20" disabled={locked || !hasTeams} value={away}
            onChange={e => setAway(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => { if (home !== '' && away !== '' && !locked && hasTeams) onSave(match.id, Number(home), Number(away)) }}
            style={inputStyle(away !== '')}
          />
        </div>

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

      {realResult && (
        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
          Resultado: {match.home_goals} – {match.away_goals}
          {bet && (
            <span style={{ marginLeft: '8px', color: exactMatch ? '#C9A84C' : correctWinner ? '#5b8ff9' : 'rgba(255,255,255,0.2)' }}>
              · Tu apuesta: {bet.home_goals_bet}–{bet.away_goals_bet}
              {exactMatch ? ' ✓✓' : correctWinner ? ' ✓' : ' ✗'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
