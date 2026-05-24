'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Team = { id: number; name: string; flag_emoji: string }
type Match = {
  id: number
  match_number: number
  phase: string
  group_name: string | null
  matchday: number | null
  played_at: string
  home_goals: number | null
  away_goals: number | null
  home_team_id: number | null
  away_team_id: number | null
  home_team?: Team
  away_team?: Team
}

const PHASE_LABELS: Record<string, string> = {
  group: 'Grupos', r32: '1/16', r16: 'Octavos', qf: 'Cuartos', sf: 'Semis', '3rd': '3º-4º', final: 'Final'
}

const PHASES = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']

export default function AdminResultadosPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState('group')
  const [activeMatchday, setActiveMatchday] = useState(1)
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()

    const { data: matchesData } = await supabase
      .from('matches')
      .select(`id, match_number, phase, group_name, matchday, played_at, home_goals, away_goals, home_team_id, away_team_id,
        home_team:home_team_id(id, name, flag_emoji),
        away_team:away_team_id(id, name, flag_emoji)`)
      .order('match_number')

    const { data: teamsData } = await supabase
      .from('teams').select('id, name, flag_emoji').order('name')

    if (matchesData) setMatches(matchesData as unknown as Match[])
    if (teamsData) setTeams(teamsData)
    setLoading(false)
  }

  async function saveResult(matchId: number, homeGoals: number, awayGoals: number) {
    const supabase = createClient()
    setSaving(matchId)
    await supabase.from('matches').update({ home_goals: homeGoals, away_goals: awayGoals }).eq('id', matchId)
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, home_goals: homeGoals, away_goals: awayGoals } : m))
    setSaving(null); setSaved(matchId)
    setTimeout(() => setSaved(null), 1500)
  }

  async function assignTeam(matchId: number, side: 'home' | 'away', teamId: number) {
    const supabase = createClient()
    const field = side === 'home' ? 'home_team_id' : 'away_team_id'
    await supabase.from('matches').update({ [field]: teamId }).eq('id', matchId)
    const team = teams.find(t => t.id === teamId)
    setMatches(prev => prev.map(m => {
      if (m.id !== matchId) return m
      return side === 'home'
        ? { ...m, home_team_id: teamId, home_team: team }
        : { ...m, away_team_id: teamId, away_team: team }
    }))
  }

  async function calculatePoints() {
    setCalculating(true)
    try {
      const res = await fetch('/api/calculate-scores', { method: 'POST' })
      const data = await res.json()
      alert(`✓ Puntos calculados. ${data.updated ?? 0} participantes actualizados.`)
    } catch {
      alert('Error al calcular puntos')
    }
    setCalculating(false)
  }

  const phaseMatches = activePhase === 'group'
    ? matches.filter(m => m.phase === 'group' && m.matchday === activeMatchday)
    : matches.filter(m => m.phase === activePhase)

  const groups = activePhase === 'group'
    ? [...new Set(phaseMatches.map(m => m.group_name))].sort() as string[]
    : []

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cargando...</p>
    </div>
  )

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>Panel administrador</div>
          <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Introducir resultados</h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Guarda el resultado y luego recalcula los puntos</p>
        </div>
        <button onClick={calculatePoints} disabled={calculating} style={{
          background: calculating ? 'rgba(201,168,76,0.2)' : 'linear-gradient(90deg, #C9A84C, #b8962a)',
          border: 'none', borderRadius: '8px', padding: '10px 18px',
          color: '#05080F', fontSize: '12px', fontWeight: 600,
          letterSpacing: '0.5px', cursor: calculating ? 'wait' : 'pointer', flexShrink: 0,
        }}>
          {calculating ? 'Calculando...' : '⚡ Recalcular puntos'}
        </button>
      </div>

      {/* Tabs de fase */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '0.5px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
        {PHASES.map(phase => (
          <button key={phase} onClick={() => setActivePhase(phase)} style={{
            fontSize: '10px', whiteSpace: 'nowrap',
            color: activePhase === phase ? '#C9A84C' : 'rgba(255,255,255,0.28)',
            padding: '10px 14px', letterSpacing: '0.5px', textTransform: 'uppercase',
            background: 'none', border: 'none',
            borderBottom: activePhase === phase ? '2px solid #C9A84C' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      {/* Selector jornada */}
      {activePhase === 'group' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {[1, 2, 3].map(j => (
            <button key={j} onClick={() => setActiveMatchday(j)} style={{
              fontSize: '10px', padding: '6px 14px', borderRadius: '6px',
              background: activeMatchday === j ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
              color: activeMatchday === j ? '#C9A84C' : 'rgba(255,255,255,0.4)',
              border: activeMatchday === j ? '0.5px solid rgba(201,168,76,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
              Jornada {j}
            </button>
          ))}
        </div>
      )}

      {/* Partidos */}
      {activePhase === 'group' ? (
        groups.map(group => (
          <div key={group} style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '9px', color: '#5b8ff9', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              Grupo {group}
              <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(26,86,196,0.3), transparent)' }} />
            </div>
            {phaseMatches.filter(m => m.group_name === group).map(match => (
              <AdminMatchRow key={match.id} match={match} teams={teams}
                isSaving={saving === match.id} isSaved={saved === match.id}
                onSaveResult={saveResult} onAssignTeam={assignTeam} />
            ))}
          </div>
        ))
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {phaseMatches.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>No hay partidos en esta fase aún</p>
            </div>
          ) : (
            phaseMatches.map(match => (
              <AdminMatchRow key={match.id} match={match} teams={teams}
                isSaving={saving === match.id} isSaved={saved === match.id}
                onSaveResult={saveResult} onAssignTeam={assignTeam} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function AdminMatchRow({ match, teams, isSaving, isSaved, onSaveResult, onAssignTeam }: {
  match: Match; teams: Team[]
  isSaving: boolean; isSaved: boolean
  onSaveResult: (id: number, h: number, a: number) => void
  onAssignTeam: (id: number, side: 'home' | 'away', teamId: number) => void
}) {
  const [homeGoals, setHomeGoals] = useState<number | ''>(match.home_goals ?? '')
  const [awayGoals, setAwayGoals] = useState<number | ''>(match.away_goals ?? '')
  const [showHomeSelector, setShowHomeSelector] = useState(false)
  const [showAwaySelector, setShowAwaySelector] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setHomeGoals(match.home_goals ?? '')
    setAwayGoals(match.away_goals ?? '')
  }, [match.home_goals, match.away_goals])

  const date = new Date(match.played_at).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric',
    month: 'short', hour: '2-digit', minute: '2-digit',
  })

  const filteredTeams = search ? teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : teams
  const hasResult = match.home_goals !== null && match.away_goals !== null

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `0.5px solid ${isSaved ? 'rgba(201,168,76,0.4)' : hasResult ? 'rgba(26,86,196,0.2)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: '10px', padding: '12px 16px', marginBottom: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.3px' }}>
          P{match.match_number} · {date}
        </span>
        <div style={{ fontSize: '11px' }}>
          {isSaving ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>...</span>
            : isSaved ? <span style={{ color: '#C9A84C' }}>✓ Guardado</span>
            : hasResult ? <span style={{ color: 'rgba(26,86,196,0.7)', fontSize: '10px' }}>✓ Con resultado</span>
            : null}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Local */}
        <div style={{ flex: 1, textAlign: 'right' }}>
          {match.home_team ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{match.home_team.name}</span>
              <span className="flag-emoji" style={{ fontSize: '18px' }}>{match.home_team.flag_emoji}</span>
            </div>
          ) : (
            <button onClick={() => { setShowHomeSelector(!showHomeSelector); setSearch('') }} style={{
              fontSize: '11px', color: '#C8102E', background: 'rgba(200,16,46,0.1)',
              border: '0.5px solid rgba(200,16,46,0.3)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
            }}>+ Asignar local</button>
          )}
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <input type="number" min="0" max="30" value={homeGoals}
            onChange={e => setHomeGoals(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => { if (homeGoals !== '' && awayGoals !== '') onSaveResult(match.id, Number(homeGoals), Number(awayGoals)) }}
            style={{
              width: '42px', height: '38px', textAlign: 'center', fontSize: '18px', fontWeight: 600,
              background: homeGoals !== '' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.06)',
              border: `0.5px solid ${homeGoals !== '' ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '6px', color: homeGoals !== '' ? '#C9A84C' : '#ffffff', outline: 'none',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '16px' }}>–</span>
          <input type="number" min="0" max="30" value={awayGoals}
            onChange={e => setAwayGoals(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => { if (homeGoals !== '' && awayGoals !== '') onSaveResult(match.id, Number(homeGoals), Number(awayGoals)) }}
            style={{
              width: '42px', height: '38px', textAlign: 'center', fontSize: '18px', fontWeight: 600,
              background: awayGoals !== '' ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.06)',
              border: `0.5px solid ${awayGoals !== '' ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '6px', color: awayGoals !== '' ? '#C9A84C' : '#ffffff', outline: 'none',
            }}
          />
        </div>

        {/* Visitante */}
        <div style={{ flex: 1 }}>
          {match.away_team ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="flag-emoji" style={{ fontSize: '18px' }}>{match.away_team.flag_emoji}</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{match.away_team.name}</span>
            </div>
          ) : (
            <button onClick={() => { setShowAwaySelector(!showAwaySelector); setSearch('') }} style={{
              fontSize: '11px', color: '#C8102E', background: 'rgba(200,16,46,0.1)',
              border: '0.5px solid rgba(200,16,46,0.3)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
            }}>+ Asignar visitante</button>
          )}
        </div>
      </div>

      {/* Selector equipo */}
      {(showHomeSelector || showAwaySelector) && (
        <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px' }}>
          <input type="text" placeholder="Buscar equipo..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', marginBottom: '8px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '7px 10px', color: '#ffffff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '100px', overflowY: 'auto' }}>
            {filteredTeams.map(team => (
              <button key={team.id} onClick={() => {
                if (showHomeSelector) { onAssignTeam(match.id, 'home', team.id); setShowHomeSelector(false) }
                else { onAssignTeam(match.id, 'away', team.id); setShowAwaySelector(false) }
                setSearch('')
              }} style={{
                display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '5px',
                background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)', fontSize: '11px', cursor: 'pointer',
              }}>
                <span className="flag-emoji" style={{ fontSize: '12px' }}>{team.flag_emoji}</span>
                <span>{team.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
