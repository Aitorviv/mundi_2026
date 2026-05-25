'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isBettingOpen } from '@/lib/deadline'
import DeadlineCountdown from '@/components/DeadlineCountdown'

type Match = {
  id: number
  match_number: number
  group_name: string
  matchday: number
  played_at: string
  home_team: { id: number; name: string; flag_emoji: string }
  away_team: { id: number; name: string; flag_emoji: string }
  home_goals: number | null
  away_goals: number | null
}

type Bet = { match_id: number; result_bet: 'home' | 'draw' | 'away' }

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function ApuestasPartidosPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<number, Bet>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeMatchday, setActiveMatchday] = useState(1)
  const bettingOpen = isBettingOpen()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()

    const { data: matchesData } = await supabase
      .from('matches')
      .select('id, match_number, group_name, matchday, played_at, home_goals, away_goals, home_team:home_team_id(id, name, flag_emoji), away_team:away_team_id(id, name, flag_emoji)')
      .eq('phase', 'group')
      .order('match_number')

    if (session?.id) {
      const { data: betsData } = await supabase
        .from('match_bets')
        .select('match_id, result_bet')
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

  async function saveBet(matchId: number, result: 'home' | 'draw' | 'away') {
    if (!bettingOpen) return
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()
    if (!session?.id) return

    // Toggle: si ya tenía esa apuesta, la borra
    const current = bets[matchId]?.result_bet
    if (current === result) {
      await supabase.from('match_bets').delete().eq('participant_id', session.id).eq('match_id', matchId)
      setBets(prev => { const n = { ...prev }; delete n[matchId]; return n })
      return
    }

    setSaving(matchId)
    await supabase.from('match_bets').upsert(
      { participant_id: session.id, match_id: matchId, result_bet: result },
      { onConflict: 'participant_id,match_id' }
    )
    setBets(prev => ({ ...prev, [matchId]: { match_id: matchId, result_bet: result } }))
    setSaving(null)
  }

  const filtered = matches.filter(m => m.matchday === activeMatchday)
  const groups = [...new Set(filtered.map(m => m.group_name))].sort()
  const totalBets = Object.keys(bets).length
  const totalMatches = matches.length
  const pct = totalMatches ? Math.round((totalBets / totalMatches) * 100) : 0

  // Completados por jornada
  const jornada1 = matches.filter(m => m.matchday === 1)
  const jornada2 = matches.filter(m => m.matchday === 2)
  const jornada3 = matches.filter(m => m.matchday === 3)
  const j1done = jornada1.filter(m => bets[m.id]).length
  const j2done = jornada2.filter(m => bets[m.id]).length
  const j3done = jornada3.filter(m => bets[m.id]).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cargando partidos...</p>
    </div>
  )

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      <DeadlineCountdown />

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', background: 'rgba(200,16,46,0.12)', border: '0.5px solid rgba(200,16,46,0.3)', padding: '3px 8px', borderRadius: '20px' }}>Fase de grupos</span>
          <span style={{ fontSize: '9px', color: '#5b8ff9', letterSpacing: '2px', textTransform: 'uppercase', background: 'rgba(26,86,196,0.12)', border: '0.5px solid rgba(26,86,196,0.3)', padding: '3px 8px', borderRadius: '20px' }}>1 pt por 1X2 correcto</span>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Resultados de partidos</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>{totalBets} / {totalMatches} partidos apostados</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '50px', textAlign: 'right' }}>{totalBets} / {totalMatches}</span>
        </div>
      </div>

      {/* Tabs jornada */}
      <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        {[
          { j: 1, done: j1done, total: jornada1.length },
          { j: 2, done: j2done, total: jornada2.length },
          { j: 3, done: j3done, total: jornada3.length },
        ].map(({ j, done, total }) => (
          <button key={j} onClick={() => setActiveMatchday(j)} style={{
            fontSize: '10px',
            color: activeMatchday === j ? '#C9A84C' : 'rgba(255,255,255,0.28)',
            padding: '10px 16px', letterSpacing: '1px', textTransform: 'uppercase',
            background: 'none', border: 'none',
            borderBottom: activeMatchday === j ? '2px solid #C9A84C' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            Jornada {j}
            {done === total && total > 0 && <span style={{ marginLeft: '4px', color: '#C9A84C' }}>✓</span>}
          </button>
        ))}
      </div>

      {/* Partidos por grupo */}
      {groups.map(group => (
        <div key={group} style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '9px', color: '#5b8ff9', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Grupo {group}
            <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(26,86,196,0.3), transparent)' }} />
          </div>
          {filtered.filter(m => m.group_name === group).map(match => (
            <MatchRow
              key={match.id}
              match={match}
              bet={bets[match.id]}
              locked={!bettingOpen}
              isSaving={saving === match.id}
              onSave={saveBet}
            />
          ))}
        </div>
      ))}

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px', marginTop: '16px' }}>
        {bettingOpen ? 'Pulsa de nuevo la misma opción para borrar · 1 pt por resultado correcto' : 'Las apuestas están cerradas'}
      </div>
    </div>
  )
}

function MatchRow({ match, bet, locked, isSaving, onSave }: {
  match: Match; bet?: Bet; locked: boolean; isSaving: boolean
  onSave: (id: number, result: 'home' | 'draw' | 'away') => void
}) {
  const date = new Date(match.played_at).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric',
    month: 'short', hour: '2-digit', minute: '2-digit',
  })

  // Resultado real si existe
  const realResult = match.home_goals !== null && match.away_goals !== null
    ? match.home_goals > match.away_goals ? 'home'
    : match.home_goals < match.away_goals ? 'away' : 'draw'
    : null

  const correct = bet && realResult && bet.result_bet === realResult
  const wrong = bet && realResult && bet.result_bet !== realResult

  const btnStyle = (type: 'home' | 'draw' | 'away'): React.CSSProperties => {
    const selected = bet?.result_bet === type
    const isCorrect = realResult === type && bet?.result_bet === type
    const isWrong = selected && realResult && realResult !== type

    return {
      flex: type === 'draw' ? '0 0 38px' : 1,
      padding: '7px 4px',
      borderRadius: '6px',
      fontSize: type === 'draw' ? '11px' : '11px',
      fontWeight: selected ? 600 : 400,
      cursor: locked ? 'not-allowed' : 'pointer',
      border: `0.5px solid ${selected ? (isCorrect ? 'rgba(201,168,76,0.6)' : isWrong ? 'rgba(200,16,46,0.4)' : 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.08)'}`,
      background: selected
        ? isCorrect ? 'rgba(201,168,76,0.2)'
        : isWrong ? 'rgba(200,16,46,0.15)'
        : 'rgba(255,255,255,0.1)'
        : 'rgba(255,255,255,0.03)',
      color: selected
        ? isCorrect ? '#C9A84C'
        : isWrong ? '#ff4d6a'
        : '#ffffff'
        : 'rgba(255,255,255,0.35)',
      transition: 'all 0.15s',
      opacity: locked && !selected ? 0.4 : 1,
      textAlign: 'center' as const,
    }
  }

  return (
    <div style={{ marginBottom: '8px' }}>
      {/* Equipos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', textAlign: 'right' }}>{match.home_team.name}</span>
          <span className="flag-emoji" style={{ fontSize: '16px', lineHeight: 1 }}>{match.home_team.flag_emoji}</span>
        </div>

        {/* Resultado real si existe */}
        {realResult ? (
          <div style={{ flexShrink: 0, minWidth: '48px', textAlign: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: correct ? '#C9A84C' : wrong ? '#ff4d6a' : 'rgba(255,255,255,0.5)' }}>
              {match.home_goals} – {match.away_goals}
            </span>
          </div>
        ) : (
          <div style={{ flexShrink: 0, minWidth: '48px', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>vs</span>
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="flag-emoji" style={{ fontSize: '16px', lineHeight: 1 }}>{match.away_team.flag_emoji}</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{match.away_team.name}</span>
        </div>
      </div>

      {/* Botones 1X2 */}
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        <button onClick={() => !locked && onSave(match.id, 'home')} style={btnStyle('home')}>
          1
        </button>
        <button onClick={() => !locked && onSave(match.id, 'draw')} style={btnStyle('draw')}>
          X
        </button>
        <button onClick={() => !locked && onSave(match.id, 'away')} style={btnStyle('away')}>
          2
        </button>
        <div style={{ marginLeft: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.15)', minWidth: '30px' }}>
          {isSaving ? '...' : correct ? <span style={{ color: '#C9A84C' }}>✓ 1pt</span> : wrong ? <span style={{ color: '#ff4d6a' }}>✗</span> : null}
        </div>
      </div>

      {/* Fecha */}
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.14)', letterSpacing: '0.5px', marginTop: '4px', paddingLeft: '2px' }}>
        {date}
      </div>
    </div>
  )
}
