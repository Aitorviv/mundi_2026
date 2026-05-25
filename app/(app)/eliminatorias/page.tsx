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
  home_team: Team
  away_team: Team
}
type Bet = { match_id: number; home_goals_bet: number; away_goals_bet: number }
type Standing = { team: Team; pts: number; gf: number; gc: number; gd: number; played: number }

// Mapa FIFA 2026 dieciseisavos
// 'slot' puede ser '1A', '2B', '3ABCDF' (tercero de esos grupos)
const R32: { match: number; home: string; away: string }[] = [
  { match: 73,  home: '2A', away: '2B'      },
  { match: 74,  home: '1C', away: '2F'      },
  { match: 75,  home: '1E', away: '3ABCDF'  },
  { match: 76,  home: '1F', away: '2C'      },
  { match: 77,  home: '2E', away: '2I'      },
  { match: 78,  home: '1I', away: '3CDFGH'  },
  { match: 79,  home: '1A', away: '3CEFHI'  },
  { match: 80,  home: '1L', away: '3EHIJK'  },
  { match: 81,  home: '1G', away: '3AEHIJ'  },
  { match: 82,  home: '1D', away: '3BEFIJ'  },
  { match: 83,  home: '1H', away: '2J'      },
  { match: 84,  home: '2K', away: '2L'      },
  { match: 85,  home: '1B', away: '3EFGIJ'  },
  { match: 86,  home: '2D', away: '2G'      },
  { match: 87,  home: '1J', away: '2H'      },
  { match: 88,  home: '1K', away: '3DEIJL'  },
]

const R16: { match: number; home: number; away: number }[] = [
  { match: 89,  home: 73, away: 75 },
  { match: 90,  home: 74, away: 77 },
  { match: 91,  home: 76, away: 78 },
  { match: 92,  home: 79, away: 80 },
  { match: 93,  home: 83, away: 84 },
  { match: 94,  home: 81, away: 82 },
  { match: 95,  home: 86, away: 88 },
  { match: 96,  home: 85, away: 87 },
]

const QF: { match: number; home: number; away: number }[] = [
  { match: 97,  home: 89, away: 90 },
  { match: 98,  home: 93, away: 94 },
  { match: 99,  home: 91, away: 92 },
  { match: 100, home: 95, away: 96 },
]

const SF: { match: number; home: number; away: number }[] = [
  { match: 101, home: 97,  away: 98  },
  { match: 102, home: 99,  away: 100 },
]

const FINAL: { match: number; home: number; away: number }[] = [
  { match: 104, home: 101, away: 102 },
]

const PHASE_PTS: Record<string, number> = { r32: 2, r16: 3, qf: 4, sf: 6, final: 9 }
const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function EliminatoriasPage() {
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<number, Bet>>({})
  const [picks, setPicks] = useState<Record<number, number>>({}) // match_number → team_id
  const [saving, setSaving] = useState<number | null>(null)
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
      .select('id, match_number, group_name, matchday, home_team:home_team_id(id, name, flag_emoji, group_name), away_team:away_team_id(id, name, flag_emoji, group_name)')
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

      const { data: picksData } = await supabase
        .from('knockout_picks')
        .select('match_number, team_id')
        .eq('participant_id', session.id)
      if (picksData) {
        const map: Record<number, number> = {}
        picksData.forEach(p => { map[p.match_number] = p.team_id })
        setPicks(map)
      }
    }

    if (matchesData) setAllMatches(matchesData as unknown as Match[])
    setLoading(false)
  }

  // Calcular clasificación de un grupo a partir de las apuestas del usuario
  function calcGroupStandings(group: string): Standing[] {
    const groupMatches = allMatches.filter(m => m.group_name === group)
    const teamMap: Record<number, Standing> = {}

    groupMatches.forEach(m => {
      if (!teamMap[m.home_team.id]) teamMap[m.home_team.id] = { team: m.home_team, pts: 0, gf: 0, gc: 0, gd: 0, played: 0 }
      if (!teamMap[m.away_team.id]) teamMap[m.away_team.id] = { team: m.away_team, pts: 0, gf: 0, gc: 0, gd: 0, played: 0 }
    })

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
      if (h > a) { home.pts += 3 }
      else if (h < a) { away.pts += 3 }
      else { home.pts += 1; away.pts += 1 }
    })

    return Object.values(teamMap).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      if (b.gf !== a.gf) return b.gf - a.gf
      return 0
    })
  }

  // Calcular todas las clasificaciones
  const allStandings: Record<string, Standing[]> = {}
  GROUPS.forEach(g => { allStandings[g] = calcGroupStandings(g) })

  // Resolver slot de grupo: '1A' → team, '2B' → team, '3ABCDF' → mejor 3º de esos grupos
  function resolveSlot(slot: string): Team | null {
    if (slot.length === 2) {
      const pos = parseInt(slot[0]) - 1
      const group = slot[1]
      return allStandings[group]?.[pos]?.team ?? null
    }
    // Tercero: elegir el mejor 3º de los grupos indicados
    const groupList = slot.slice(1).split('')
    const thirds = groupList
      .map(g => allStandings[g]?.[2])
      .filter(Boolean) as Standing[]
    const best = thirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      if (b.gf !== a.gf) return b.gf - a.gf
      return 0
    })[0]
    return best?.team ?? null
  }

  // Resolver slot de eliminatoria: ganador del partido previo
  function resolveKnockout(prevMatch: number): Team | null {
    const teamId = picks[prevMatch]
    if (!teamId) return null
    // Buscar el equipo en allMatches
    for (const m of allMatches) {
      if (m.home_team.id === teamId) return m.home_team
      if (m.away_team.id === teamId) return m.away_team
    }
    // Buscar en picks de rondas anteriores
    const allTeams: Record<number, Team> = {}
    allMatches.forEach(m => {
      allTeams[m.home_team.id] = m.home_team
      allTeams[m.away_team.id] = m.away_team
    })
    return allTeams[teamId] ?? null
  }

  async function savePick(matchNumber: number, teamId: number) {
    if (!bettingOpen) return
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()
    if (!session?.id) return

    // Toggle
    if (picks[matchNumber] === teamId) {
      await supabase.from('knockout_picks').delete()
        .eq('participant_id', session.id).eq('match_number', matchNumber)
      setPicks(prev => { const n = { ...prev }; delete n[matchNumber]; return n })
      return
    }

    setSaving(matchNumber)
    await supabase.from('knockout_picks').upsert(
      { participant_id: session.id, match_number: matchNumber, team_id: teamId },
      { onConflict: 'participant_id,match_number' }
    )
    setPicks(prev => ({ ...prev, [matchNumber]: teamId }))
    setSaving(null)
  }

  const totalBets = Object.keys(picks).length
  const totalPossible = 31
  const betsCompleted = Object.keys(bets).length
  const groupsComplete = betsCompleted === 72

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cargando...</p>
    </div>
  )

  const phases = [
    { key: 'r32', label: '1/16', data: R32 },
    { key: 'r16', label: 'Octavos', data: R16 },
    { key: 'qf',  label: 'Cuartos', data: QF },
    { key: 'sf',  label: 'Semis',   data: SF },
    { key: 'final', label: 'Final', data: FINAL },
  ]

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      <DeadlineCountdown />

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', background: 'rgba(200,16,46,0.12)', border: '0.5px solid rgba(200,16,46,0.3)', padding: '3px 8px', borderRadius: '20px' }}>Fase eliminatoria</span>
          <span style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '2px', textTransform: 'uppercase', background: 'rgba(201,168,76,0.12)', border: '0.5px solid rgba(201,168,76,0.3)', padding: '3px 8px', borderRadius: '20px' }}>2→3→4→6→9→+12 pts</span>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Eliminatorias</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
          Bracket generado desde tus marcadores de grupos · {totalBets} / {totalPossible} picks
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((totalBets/totalPossible)*100)}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '50px', textAlign: 'right' }}>{totalBets}/{totalPossible}</span>
        </div>
      </div>

      {/* Aviso si faltan apuestas de grupos */}
      {!groupsComplete && (
        <div style={{ background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: '#C9A84C' }}>⚠️ Completa primero los marcadores de grupos para ver tu bracket completo</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{betsCompleted} / 72 partidos apostados</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '0.5px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
        {phases.map(phase => (
          <button key={phase.key} onClick={() => setActivePhase(phase.key)} style={{
            fontSize: '10px', whiteSpace: 'nowrap',
            color: activePhase === phase.key ? '#C9A84C' : 'rgba(255,255,255,0.28)',
            padding: '10px 14px', letterSpacing: '0.5px', textTransform: 'uppercase',
            background: 'none', border: 'none',
            borderBottom: activePhase === phase.key ? '2px solid #C9A84C' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {phase.label}
          </button>
        ))}
      </div>

      {/* Puntos de la fase */}
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
        {PHASE_PTS[activePhase]} pts por equipo acertado{activePhase === 'final' ? ' + 12 pts campeón' : ''}
      </div>

      {/* Partidos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {phases.find(p => p.key === activePhase)?.data.map((matchDef: any) => {
          const isR32 = activePhase === 'r32'
          const homeTeam = isR32 ? resolveSlot(matchDef.home) : resolveKnockout(matchDef.home)
          const awayTeam = isR32 ? resolveSlot(matchDef.away) : resolveKnockout(matchDef.away)
          const pick = picks[matchDef.match]
          const isSaving = saving === matchDef.match

          return (
            <div key={matchDef.match} style={{
              background: 'rgba(255,255,255,0.02)',
              border: `0.5px solid ${pick ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: '10px', padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px' }}>
                  P{matchDef.match}
                  {isR32 && <span style={{ marginLeft: '6px', color: 'rgba(255,255,255,0.15)' }}>{matchDef.home} vs {matchDef.away}</span>}
                </span>
                <span style={{ fontSize: '11px' }}>
                  {locked ? '🔒' : isSaving ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>...</span> : pick ? <span style={{ color: '#C9A84C' }}>✓</span> : null}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Local */}
                <TeamButton team={homeTeam} pick={pick} locked={!bettingOpen} side="home"
                  prevLabel={!isR32 ? `Gan. P${matchDef.home}` : undefined}
                  onClick={() => homeTeam && !bettingOpen === false && savePick(matchDef.match, homeTeam.id)} />

                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>vs</span>

                {/* Visitante */}
                <TeamButton team={awayTeam} pick={pick} locked={!bettingOpen} side="away"
                  prevLabel={!isR32 ? `Gan. P${matchDef.away}` : undefined}
                  onClick={() => awayTeam && !bettingOpen === false && savePick(matchDef.match, awayTeam.id)} />
              </div>

              {pick && (() => {
                // Encontrar el equipo del pick
                let pickTeam: Team | null = null
                for (const m of allMatches) {
                  if (m.home_team.id === pick) { pickTeam = m.home_team; break }
                  if (m.away_team.id === pick) { pickTeam = m.away_team; break }
                }
                if (!pickTeam) return null
                return (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#C9A84C', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>Pasa:</span>
                    <span className="flag-emoji" style={{ fontSize: '13px' }}>{pickTeam.flag_emoji}</span>
                    <span>{pickTeam.name}</span>
                    {activePhase === 'final' && <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>🏆 Tu campeón</span>}
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>

      {/* Banner campeón */}
      {activePhase === 'final' && picks[104] && (() => {
        let champion: Team | null = null
        for (const m of allMatches) {
          if (m.home_team.id === picks[104]) { champion = m.home_team; break }
          if (m.away_team.id === picks[104]) { champion = m.away_team; break }
        }
        if (!champion) return null
        return (
          <div style={{ marginTop: '16px', background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.3)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px', fontFamily: "'Noto Color Emoji', sans-serif" }}>🏆</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>Tu campeón del mundo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '8px' }}>
              <span className="flag-emoji" style={{ fontSize: '28px' }}>{champion.flag_emoji}</span>
              <span style={{ fontSize: '20px', fontWeight: 500, color: '#C9A84C' }}>{champion.name}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>9 pts finalista + 12 pts campeón = 21 pts potenciales</div>
          </div>
        )
      })()}

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', marginTop: '24px' }}>
        {bettingOpen ? 'Pulsa el equipo para elegirlo · pulsa de nuevo para borrar' : 'Las apuestas están cerradas'}
      </div>
    </div>
  )
}

const locked_global = false

function TeamButton({ team, pick, locked, side, prevLabel, onClick }: {
  team: Team | null; pick: number | undefined; locked: boolean
  side: 'home' | 'away'; prevLabel?: string; onClick: () => void
}) {
  const selected = team && pick === team.id
  if (!team) return (
    <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: side === 'home' ? 'right' : 'left' }}>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>{prevLabel ?? 'Por determinar'}</span>
    </div>
  )

  return (
    <button onClick={onClick} disabled={locked} style={{
      flex: 1, padding: '10px 12px',
      background: selected ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
      border: `0.5px solid ${selected ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '8px', cursor: locked ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', gap: '8px',
      flexDirection: side === 'home' ? 'row-reverse' : 'row',
      transition: 'all 0.15s', opacity: locked && !selected ? 0.6 : 1,
    }}>
      <span className="flag-emoji" style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>{team.flag_emoji}</span>
      <span style={{ fontSize: '12px', fontWeight: selected ? 600 : 400, color: selected ? '#C9A84C' : 'rgba(255,255,255,0.8)', textAlign: side === 'home' ? 'right' : 'left' }}>
        {team.name}
      </span>
    </button>
  )
}
