'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isBettingOpen } from '@/lib/deadline'
import DeadlineCountdown from '@/components/DeadlineCountdown'

type Team = { id: number; name: string; flag_emoji: string; group_name?: string }

// Mapa de dieciseisavos según FIFA 2026
// Cada partido tiene: qué clasificado juega de local y de visitante
const R32_MAP = [
  { match: 73,  home: '2A', away: '2B'       },
  { match: 74,  home: '1C', away: '2F'       },
  { match: 75,  home: '1E', away: '3ABCDF'   },
  { match: 76,  home: '1F', away: '2C'       },
  { match: 77,  home: '2E', away: '2I'       },
  { match: 78,  home: '1I', away: '3CDFGH'   },
  { match: 79,  home: '1A', away: '3CEFHI'   },
  { match: 80,  home: '1L', away: '3EHIJK'   },
  { match: 81,  home: '1G', away: '3AEHIJ'   },
  { match: 82,  home: '1D', away: '3BEFIJ'   },
  { match: 83,  home: '1H', away: '2J'       },
  { match: 84,  home: '2K', away: '2L'       },
  { match: 85,  home: '1B', away: '3EFGIJ'   },
  { match: 86,  home: '2D', away: '2G'       },
  { match: 87,  home: '1J', away: '2H'       },
  { match: 88,  home: '1K', away: '3DEIJL'   },
]

// Mapa de octavos (ganador de qué dieciseisavo juega contra quién)
const R16_MAP = [
  { match: 89,  home: 73, away: 75  },
  { match: 90,  home: 74, away: 77  },
  { match: 91,  home: 76, away: 78  },
  { match: 92,  home: 79, away: 80  },
  { match: 93,  home: 83, away: 84  },
  { match: 94,  home: 81, away: 82  },
  { match: 95,  home: 86, away: 88  },
  { match: 96,  home: 85, away: 87  },
]

const QF_MAP = [
  { match: 97,  home: 89, away: 90  },
  { match: 98,  home: 93, away: 94  },
  { match: 99,  home: 91, away: 92  },
  { match: 100, home: 95, away: 96  },
]

const SF_MAP = [
  { match: 101, home: 97,  away: 98  },
  { match: 102, home: 99,  away: 100 },
]

const FINAL_MAP = [
  { match: 104, home: 101, away: 102 },
]

const PHASE_LABELS: Record<string, string> = {
  r32: '1/16 de final', r16: 'Octavos de final', qf: 'Cuartos de final',
  sf: 'Semifinales', final: 'Final'
}

const PHASE_PTS: Record<string, number> = {
  r32: 2, r16: 3, qf: 4, sf: 6, final: 9
}

export default function EliminatoriasPage() {
  const [teams, setTeams] = useState<Record<number, Team>>({})
  const [groupBets, setGroupBets] = useState<Record<string, number>>({}) // '1A' -> team_id
  const [picks, setPicks] = useState<Record<number, number>>({}) // match_number -> team_id
  const [saving, setSaving] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState('r32')
  const bettingOpen = isBettingOpen()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const sessionRes = await fetch('/api/auth/me')
    const session = await sessionRes.json()

    // Cargar todos los equipos
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name, flag_emoji, group_name')
    if (teamsData) {
      const map: Record<number, Team> = {}
      teamsData.forEach(t => { map[t.id] = t })
      setTeams(map)
    }

    if (!session?.id) { setLoading(false); return }

    // Cargar apuestas de posiciones de grupo del usuario
    const { data: groupBetsData } = await supabase
      .from('group_position_bets')
      .select('group_name, position, team_id')
      .eq('participant_id', session.id)

    if (groupBetsData) {
      const map: Record<string, number> = {}
      groupBetsData.forEach(b => {
        map[`${b.position}${b.group_name}`] = b.team_id // e.g. '1A', '2B', '3C'
      })
      setGroupBets(map)
    }

    // Cargar picks de eliminatorias existentes
    const { data: picksData } = await supabase
      .from('knockout_picks')
      .select('match_number, team_id')
      .eq('participant_id', session.id)

    if (picksData) {
      const map: Record<number, number> = {}
      picksData.forEach(p => { map[p.match_number] = p.team_id })
      setPicks(map)
    }

    setLoading(false)
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

  // Resolver qué equipo ocupa una posición de grupo (ej: '1A', '2B', '3ABCDF')
  function resolveGroupSlot(slot: string): number | null {
    if (slot.length === 2) {
      // '1A', '2B', etc.
      return groupBets[slot] ?? null
    }
    // Tercero: '3ABCDF' — el mejor tercero según el usuario
    // Por simplicidad mostramos todos los terceros de esos grupos y el usuario elige
    return null
  }

  // Resolver quién juega en un partido de eliminatorias
  // basándose en el pick del partido previo
  function resolveKnockoutSlot(prevMatchNumber: number): number | null {
    return picks[prevMatchNumber] ?? null
  }

  // Obtener los dos equipos de un partido r32
  function getR32Teams(matchDef: typeof R32_MAP[0]): { home: number | null; away: number | null; awaySlot: string } {
    return {
      home: resolveGroupSlot(matchDef.home),
      away: resolveGroupSlot(matchDef.away),
      awaySlot: matchDef.away,
    }
  }

  // Obtener los terceros disponibles para un slot como '3ABCDF'
  function getThirds(groups: string): Array<{ teamId: number; team: Team }> {
    return groups.split('').map(g => {
      const teamId = groupBets[`3${g}`]
      if (!teamId) return null
      return { teamId, team: teams[teamId] }
    }).filter(Boolean) as Array<{ teamId: number; team: Team }>
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cargando...</p>
    </div>
  )

  const totalPicks = Object.keys(picks).length
  const totalMatches = 31 // 16 + 8 + 4 + 2 + 1

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      <DeadlineCountdown />

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', background: 'rgba(200,16,46,0.12)', border: '0.5px solid rgba(200,16,46,0.3)', padding: '3px 8px', borderRadius: '20px' }}>Fase eliminatoria</span>
          <span style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '2px', textTransform: 'uppercase', background: 'rgba(201,168,76,0.12)', border: '0.5px solid rgba(201,168,76,0.3)', padding: '3px 8px', borderRadius: '20px' }}>2→3→4→6→9→+12 pts</span>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Eliminatorias</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>
          El bracket se genera a partir de tus apuestas de grupos
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((totalPicks/totalMatches)*100)}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '50px', textAlign: 'right' }}>{totalPicks} / {totalMatches}</span>
        </div>
      </div>

      {/* Aviso si faltan apuestas de grupos */}
      {Object.keys(groupBets).length < 48 && (
        <div style={{ background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', color: '#C9A84C' }}>⚠️ Completa primero las posiciones de grupo para ver tu bracket completo</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Tienes {Object.keys(groupBets).length} / 48 posiciones apostadas</p>
        </div>
      )}

      {/* Tabs de fase */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '0.5px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
        {['r32','r16','qf','sf','final'].map(phase => (
          <button key={phase} onClick={() => setActivePhase(phase)} style={{
            fontSize: '10px', whiteSpace: 'nowrap',
            color: activePhase === phase ? '#C9A84C' : 'rgba(255,255,255,0.28)',
            padding: '10px 14px', letterSpacing: '0.5px', textTransform: 'uppercase',
            background: 'none', border: 'none',
            borderBottom: activePhase === phase ? '2px solid #C9A84C' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {phase === 'r32' ? '1/16' : phase === 'r16' ? 'Octavos' : phase === 'qf' ? 'Cuartos' : phase === 'sf' ? 'Semis' : 'Final'}
          </button>
        ))}
      </div>

      {/* Contenido por fase */}
      <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {PHASE_LABELS[activePhase]}
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', letterSpacing: '1px', textTransform: 'none' }}>· {PHASE_PTS[activePhase]} pts por acierto{activePhase === 'final' ? ' + 12 pts campeón' : ''}</span>
        <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' }} />
      </div>

      {activePhase === 'r32' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {R32_MAP.map(matchDef => {
            const { home: homeId, away: awayId, awaySlot } = getR32Teams(matchDef)
            const isThird = awaySlot.startsWith('3') && awaySlot.length > 2
            const thirds = isThird ? getThirds(awaySlot.slice(1)) : []
            const pick = picks[matchDef.match]

            return (
              <KnockoutMatch
                key={matchDef.match}
                matchNumber={matchDef.match}
                homeTeam={homeId ? teams[homeId] : null}
                awayTeam={awayId ? teams[awayId] : null}
                homeId={homeId}
                awayId={awayId}
                isThirdSlot={isThird}
                thirdOptions={thirds}
                thirdSlot={awaySlot}
                pick={pick}
                locked={!bettingOpen}
                saving={saving === matchDef.match}
                onPick={savePick}
                teams={teams}
              />
            )
          })}
        </div>
      )}

      {activePhase === 'r16' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {R16_MAP.map(matchDef => {
            const homeId = resolveKnockoutSlot(matchDef.home)
            const awayId = resolveKnockoutSlot(matchDef.away)
            const pick = picks[matchDef.match]
            return (
              <KnockoutMatch
                key={matchDef.match}
                matchNumber={matchDef.match}
                homeTeam={homeId ? teams[homeId] : null}
                awayTeam={awayId ? teams[awayId] : null}
                homeId={homeId}
                awayId={awayId}
                isThirdSlot={false}
                thirdOptions={[]}
                thirdSlot=""
                pick={pick}
                locked={!bettingOpen}
                saving={saving === matchDef.match}
                onPick={savePick}
                teams={teams}
                prevMatches={`P${matchDef.home} vs P${matchDef.away}`}
              />
            )
          })}
        </div>
      )}

      {activePhase === 'qf' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {QF_MAP.map(matchDef => {
            const homeId = resolveKnockoutSlot(matchDef.home)
            const awayId = resolveKnockoutSlot(matchDef.away)
            const pick = picks[matchDef.match]
            return (
              <KnockoutMatch
                key={matchDef.match}
                matchNumber={matchDef.match}
                homeTeam={homeId ? teams[homeId] : null}
                awayTeam={awayId ? teams[awayId] : null}
                homeId={homeId}
                awayId={awayId}
                isThirdSlot={false}
                thirdOptions={[]}
                thirdSlot=""
                pick={pick}
                locked={!bettingOpen}
                saving={saving === matchDef.match}
                onPick={savePick}
                teams={teams}
                prevMatches={`P${matchDef.home} vs P${matchDef.away}`}
              />
            )
          })}
        </div>
      )}

      {activePhase === 'sf' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {SF_MAP.map(matchDef => {
            const homeId = resolveKnockoutSlot(matchDef.home)
            const awayId = resolveKnockoutSlot(matchDef.away)
            const pick = picks[matchDef.match]
            return (
              <KnockoutMatch
                key={matchDef.match}
                matchNumber={matchDef.match}
                homeTeam={homeId ? teams[homeId] : null}
                awayTeam={awayId ? teams[awayId] : null}
                homeId={homeId}
                awayId={awayId}
                isThirdSlot={false}
                thirdOptions={[]}
                thirdSlot=""
                pick={pick}
                locked={!bettingOpen}
                saving={saving === matchDef.match}
                onPick={savePick}
                teams={teams}
                prevMatches={`P${matchDef.home} vs P${matchDef.away}`}
              />
            )
          })}
        </div>
      )}

      {activePhase === 'final' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FINAL_MAP.map(matchDef => {
            const homeId = resolveKnockoutSlot(matchDef.home)
            const awayId = resolveKnockoutSlot(matchDef.away)
            const pick = picks[matchDef.match]
            return (
              <div key={matchDef.match}>
                <KnockoutMatch
                  matchNumber={matchDef.match}
                  homeTeam={homeId ? teams[homeId] : null}
                  awayTeam={awayId ? teams[awayId] : null}
                  homeId={homeId}
                  awayId={awayId}
                  isThirdSlot={false}
                  thirdOptions={[]}
                  thirdSlot=""
                  pick={pick}
                  locked={!bettingOpen}
                  saving={saving === matchDef.match}
                  onPick={savePick}
                  teams={teams}
                  prevMatches={`P${matchDef.home} vs P${matchDef.away}`}
                  isFinal
                />
                {pick && teams[pick] && (
                  <div style={{ marginTop: '12px', background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '14px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontFamily: "'Noto Color Emoji', sans-serif", marginBottom: '6px' }}>🏆</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Tu campeón</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <span className="flag-emoji" style={{ fontSize: '22px' }}>{teams[pick].flag_emoji}</span>
                      <span style={{ fontSize: '16px', fontWeight: 500, color: '#C9A84C' }}>{teams[pick].name}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#C9A84C', marginTop: '6px' }}>9 pts finalista + 12 pts campeón = 21 pts</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px', marginTop: '24px' }}>
        {bettingOpen ? 'Pulsa el equipo para elegirlo · pulsa de nuevo para borrar' : 'Las apuestas están cerradas'}
      </div>
    </div>
  )
}

function KnockoutMatch({
  matchNumber, homeTeam, awayTeam, homeId, awayId,
  isThirdSlot, thirdOptions, thirdSlot, pick, locked, saving,
  onPick, teams, prevMatches, isFinal
}: {
  matchNumber: number
  homeTeam: Team | null; awayTeam: Team | null
  homeId: number | null; awayId: number | null
  isThirdSlot: boolean
  thirdOptions: Array<{ teamId: number; team: Team }>
  thirdSlot: string
  pick: number | undefined
  locked: boolean; saving: boolean
  onPick: (matchNumber: number, teamId: number) => void
  teams: Record<number, Team>
  prevMatches?: string
  isFinal?: boolean
}) {
  const teamBtn = (teamId: number | null, team: Team | null, side: 'home' | 'away') => {
    if (!teamId || !team) return (
      <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '8px', textAlign: side === 'home' ? 'right' : 'left' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
          {prevMatches ? `Ganador P${side === 'home' ? prevMatches.split(' vs ')[0].replace('P','') : prevMatches.split(' vs ')[1]}` : 'Por determinar'}
        </span>
      </div>
    )

    const selected = pick === teamId
    return (
      <button onClick={() => !locked && onPick(matchNumber, teamId)} style={{
        flex: 1, padding: '10px 12px',
        background: selected ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
        border: `0.5px solid ${selected ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '8px', cursor: locked ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center',
        gap: '8px', flexDirection: side === 'home' ? 'row-reverse' : 'row',
        transition: 'all 0.15s', textAlign: side === 'home' ? 'right' : 'left',
        opacity: locked && !selected ? 0.6 : 1,
      }}>
        <span className="flag-emoji" style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>{team.flag_emoji}</span>
        <span style={{ fontSize: '12px', fontWeight: selected ? 600 : 400, color: selected ? '#C9A84C' : 'rgba(255,255,255,0.8)' }}>
          {team.name}
        </span>
      </button>
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `0.5px solid ${pick ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: '10px', padding: '12px 14px', marginBottom: '2px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px' }}>
          P{matchNumber}{isFinal ? ' · 🏆 FINAL' : ''}
        </span>
        <div style={{ fontSize: '11px' }}>
          {saving ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>...</span>
            : locked ? <span>🔒</span>
            : pick ? <span style={{ color: '#C9A84C' }}>✓</span>
            : null}
        </div>
      </div>

      {/* Si es un slot de tercero con múltiples opciones */}
      {isThirdSlot && !awayTeam ? (
        <div>
          {teamBtn(homeId, homeTeam, 'home')}
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '6px' }}>
              Tercero ({thirdSlot.slice(1).split('').join('/')}) — elige cuál pasa:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {thirdOptions.length > 0 ? thirdOptions.map(({ teamId, team }) => {
                const selected = pick === teamId
                return (
                  <button key={teamId} onClick={() => !locked && onPick(matchNumber, teamId)} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 10px', borderRadius: '6px',
                    background: selected ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${selected ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: selected ? '#C9A84C' : 'rgba(255,255,255,0.6)',
                    fontSize: '12px', cursor: locked ? 'not-allowed' : 'pointer',
                  }}>
                    <span className="flag-emoji" style={{ fontSize: '14px' }}>{team.flag_emoji}</span>
                    <span>{team.name}</span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>3º{team.group_name}</span>
                  </button>
                )
              }) : (
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
                  Completa las posiciones de grupo para ver los terceros
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {teamBtn(homeId, homeTeam, 'home')}
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>vs</span>
          {teamBtn(awayId, awayTeam, 'away')}
        </div>
      )}

      {pick && teams[pick] && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#C9A84C', textAlign: 'center' }}>
          Pasa: <span className="flag-emoji">{teams[pick].flag_emoji}</span> {teams[pick].name}
        </div>
      )}
    </div>
  )
}
