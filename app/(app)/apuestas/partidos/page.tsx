'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isBettingOpen } from '@/lib/deadline'
import DeadlineCountdown from '@/components/DeadlineCountdown'

type Team = { id: number; name: string; flag_emoji: string; group_name: string }
type Match = {
  id: number
  match_number: number
  group_name: string
  matchday: number
  played_at: string
  home_goals: number | null
  away_goals: number | null
  home_team: Team
  away_team: Team
}
type Bet = { match_id: number; home_goals_bet: number; away_goals_bet: number }

type TeamStanding = {
  team: Team
  pts: number; played: number; won: number; drawn: number; lost: number
  gf: number; gc: number; gd: number
}

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function ApuestasPartidosPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<number, Bet>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeMatchday, setActiveMatchday] = useState(1)
  const [showStandings, setShowStandings] = useState(false)
  const bettingOpen = isBettingOpen()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()

    const { data: matchesData } = await supabase
      .from('matches')
      .select('id, match_number, group_name, matchday, played_at, home_goals, away_goals, home_team:home_team_id(id, name, flag_emoji, group_name), away_team:away_team_id(id, name, flag_emoji, group_name)')
      .eq('phase', 'group')
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

  // Calcular clasificación de un grupo a partir de las apuestas del usuario
  function calcStandings(group: string): TeamStanding[] {
    const groupMatches = matches.filter(m => m.group_name === group)
    const teamMap: Record<number, TeamStanding> = {}

    // Inicializar equipos
    groupMatches.forEach(m => {
      if (!teamMap[m.home_team.id]) teamMap[m.home_team.id] = { team: m.home_team, pts: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, gc: 0, gd: 0 }
      if (!teamMap[m.away_team.id]) teamMap[m.away_team.id] = { team: m.away_team, pts: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, gc: 0, gd: 0 }
    })

    // Calcular stats desde las apuestas del usuario
    groupMatches.forEach(m => {
      const bet = bets[m.id]
      if (!bet) return
      const h = bet.home_goals_bet
      const a = bet.away_goals_bet
      const home = teamMap[m.home_team.id]
      const away = teamMap[m.away_team.id]
      home.played++; away.played++
      home.gf += h; home.gc += a; home.gd = home.gf - home.gc
      away.gf += a; away.gc += h; away.gd = away.gf - away.gc
      if (h > a) { home.won++; home.pts += 3; away.lost++ }
      else if (h < a) { away.won++; away.pts += 3; home.lost++ }
      else { home.drawn++; away.drawn++; home.pts += 1; away.pts += 1 }
    })

    return Object.values(teamMap).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      if (b.gf !== a.gf) return b.gf - a.gf
      return 0
    })
  }

  const filtered = matches.filter(m => m.matchday === activeMatchday)
  const groups = [...new Set(filtered.map(m => m.group_name))].sort()
  const totalBets = Object.keys(bets).length
  const totalMatches = matches.length
  const pct = totalMatches ? Math.round((totalBets / totalMatches) * 100) : 0

  const j1 = matches.filter(m => m.matchday === 1)
  const j2 = matches.filter(m => m.matchday === 2)
  const j3 = matches.filter(m => m.matchday === 3)

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
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>{totalBets} / {totalMatches} partidos apostados · el marcador calcula tu clasificación de grupo</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '50px', textAlign: 'right' }}>{totalBets} / {totalMatches}</span>
        </div>
      </div>

      {/* Toggle clasificaciones */}
      <button onClick={() => setShowStandings(!showStandings)} style={{
        width: '100%', padding: '10px 16px', marginBottom: '16px',
        background: showStandings ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
        border: `0.5px solid ${showStandings ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '8px', color: showStandings ? '#C9A84C' : 'rgba(255,255,255,0.4)',
        fontSize: '11px', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>📊 Ver mi clasificación de grupos calculada</span>
        <span>{showStandings ? '▲' : '▼'}</span>
      </button>

      {/* Clasificaciones calculadas */}
      {showStandings && (
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {GROUPS.map(group => {
            const standings = calcStandings(group)
            if (standings.every(s => s.played === 0)) return null
            return (
              <div key={group} style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '8px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.05)', fontSize: '9px', color: '#5b8ff9', letterSpacing: '3px', textTransform: 'uppercase' }}>
                  Grupo {group}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                      <th style={{ padding: '6px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>Pos</th>
                      <th style={{ padding: '6px 4px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>Selección</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>J</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>G</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>E</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>P</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>GF</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>GC</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>DG</th>
                      <th style={{ padding: '6px 14px', textAlign: 'center', color: '#C9A84C', fontWeight: 600 }}>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={s.team.id} style={{ borderBottom: i < 3 ? '0.5px solid rgba(255,255,255,0.03)' : 'none', background: i < 2 ? 'rgba(26,86,196,0.05)' : i === 2 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                        <td style={{ padding: '7px 14px', color: i < 2 ? '#5b8ff9' : i === 2 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)', fontWeight: i < 2 ? 600 : 400 }}>{i + 1}º</td>
                        <td style={{ padding: '7px 4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span className="flag-emoji" style={{ fontSize: '13px' }}>{s.team.flag_emoji}</span>
                            <span style={{ fontSize: '11px', color: i < 2 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)' }}>{s.team.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>{s.played}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>{s.won}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>{s.drawn}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>{s.lost}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>{s.gf}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>{s.gc}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: s.gd > 0 ? '#5b8ff9' : s.gd < 0 ? '#ff4d6a' : 'rgba(255,255,255,0.5)' }}>{s.gd > 0 ? '+' : ''}{s.gd}</td>
                        <td style={{ padding: '7px 14px', textAlign: 'center', color: '#C9A84C', fontWeight: 600 }}>{s.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabs jornada */}
      <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        {[
          { j: 1, total: j1.length, done: j1.filter(m => bets[m.id]).length },
          { j: 2, total: j2.length, done: j2.filter(m => bets[m.id]).length },
          { j: 3, total: j3.length, done: j3.filter(m => bets[m.id]).length },
        ].map(({ j, total, done }) => (
          <button key={j} onClick={() => setActiveMatchday(j)} style={{
            fontSize: '10px', color: activeMatchday === j ? '#C9A84C' : 'rgba(255,255,255,0.28)',
            padding: '10px 16px', letterSpacing: '1px', textTransform: 'uppercase',
            background: 'none', border: 'none',
            borderBottom: activeMatchday === j ? '2px solid #C9A84C' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            Jornada {j} {done === total && total > 0 ? '✓' : `${done}/${total}`}
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
              isSaved={saved === match.id}
              onSave={saveBet}
              onDelete={deleteBet}
            />
          ))}
        </div>
      ))}

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', marginTop: '16px' }}>
        {bettingOpen ? 'Se guarda al salir del campo · ✕ para borrar · el marcador calcula tu clasificación de grupos' : 'Las apuestas están cerradas'}
      </div>
    </div>
  )
}

function MatchRow({ match, bet, locked, isSaving, isSaved, onSave, onDelete }: {
  match: Match; bet?: Bet; locked: boolean
  isSaving: boolean; isSaved: boolean
  onSave: (id: number, h: number, a: number) => void
  onDelete: (id: number) => void
}) {
  const [home, setHome] = useState<number | ''>(bet?.home_goals_bet ?? '')
  const [away, setAway] = useState<number | ''>(bet?.away_goals_bet ?? '')

  useEffect(() => {
    if (bet) { setHome(bet.home_goals_bet); setAway(bet.away_goals_bet) }
    else { setHome(''); setAway('') }
  }, [bet])

  const date = new Date(match.played_at).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric',
    month: 'short', hour: '2-digit', minute: '2-digit',
  })

  // Resultado real 1X2
  const realResult = match.home_goals !== null && match.away_goals !== null
    ? match.home_goals > match.away_goals ? 'home' : match.home_goals < match.away_goals ? 'away' : 'draw'
    : null

  // Apuesta 1X2 del usuario
  const betResult = bet
    ? bet.home_goals_bet > bet.away_goals_bet ? 'home' : bet.home_goals_bet < bet.away_goals_bet ? 'away' : 'draw'
    : null

  const correct = realResult && betResult && realResult === betResult
  const wrong = realResult && betResult && realResult !== betResult

  const inputStyle = (filled: boolean): React.CSSProperties => ({
    width: '38px', height: '36px', textAlign: 'center', fontSize: '17px', fontWeight: 600,
    background: filled ? 'rgba(26,86,196,0.1)' : 'rgba(255,255,255,0.04)',
    border: `0.5px solid ${filled ? 'rgba(26,86,196,0.5)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: '6px', color: filled ? '#5b8ff9' : '#ffffff', outline: 'none',
    opacity: locked ? 0.4 : 1, cursor: locked ? 'not-allowed' : 'text',
  })

  return (
    <div style={{ marginBottom: '4px', background: 'rgba(255,255,255,0.02)', border: `0.5px solid ${correct ? 'rgba(201,168,76,0.3)' : wrong ? 'rgba(200,16,46,0.2)' : 'rgba(255,255,255,0.04)'}`, borderRadius: '8px', padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Local */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', textAlign: 'right' }}>{match.home_team.name}</span>
          <span className="flag-emoji" style={{ fontSize: '16px', lineHeight: 1 }}>{match.home_team.flag_emoji}</span>
        </div>

        {/* Score inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <input type="number" min="0" max="20" disabled={locked} value={home}
            onChange={e => setHome(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => { if (home !== '' && away !== '' && !locked) onSave(match.id, Number(home), Number(away)) }}
            style={inputStyle(home !== '')}
          />
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '13px' }}>–</span>
          <input type="number" min="0" max="20" disabled={locked} value={away}
            onChange={e => setAway(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => { if (home !== '' && away !== '' && !locked) onSave(match.id, Number(home), Number(away)) }}
            style={inputStyle(away !== '')}
          />
        </div>

        {/* Visitante */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="flag-emoji" style={{ fontSize: '16px', lineHeight: 1 }}>{match.away_team.flag_emoji}</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{match.away_team.name}</span>
        </div>

        {/* Estado */}
        <div style={{ width: '28px', textAlign: 'center', fontSize: '11px', flexShrink: 0 }}>
          {locked ? '🔒'
            : isSaving ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>...</span>
            : isSaved ? <span style={{ color: '#C9A84C' }}>✓</span>
            : bet ? (
              <button onClick={() => onDelete(match.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,16,46,0.5)', fontSize: '13px', padding: '2px' }}>✕</button>
            ) : null}
        </div>
      </div>

      {/* Resultado real + feedback */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.5px' }}>{date}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {realResult && (
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
              Real: {match.home_goals}–{match.away_goals}
            </span>
          )}
          {correct && <span style={{ fontSize: '10px', color: '#C9A84C' }}>✓ 1pt</span>}
          {wrong && <span style={{ fontSize: '10px', color: '#ff4d6a' }}>✗ 0pt</span>}
          {bet && !realResult && (
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>
              {bet.home_goals_bet}–{bet.away_goals_bet} · {betResult === 'home' ? '1' : betResult === 'draw' ? 'X' : '2'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
