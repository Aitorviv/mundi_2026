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
type SpecialResult = {
  category: string
  player_name: string | null
  goals_scored: number
  clean_sheets: number
  is_winner: boolean
}

const PHASE_LABELS: Record<string, string> = {
  group: 'Grupos', r32: '1/16', r16: 'Octavos', qf: 'Cuartos', sf: 'Semis', '3rd': '3º-4º', final: 'Final'
}
const PHASES = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']

export default function AdminResultadosPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [specials, setSpecials] = useState<Record<string, SpecialResult>>({})
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState('group')
  const [activeMatchday, setActiveMatchday] = useState(1)
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [activeTab, setActiveTab] = useState<'matches' | 'specials'>('matches')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const [matchesRes, teamsRes, specialsRes] = await Promise.all([
      supabase.from('matches').select(`id, match_number, phase, group_name, matchday, played_at, home_goals, away_goals, home_team_id, away_team_id,
        home_team:home_team_id(id, name, flag_emoji),
        away_team:away_team_id(id, name, flag_emoji)`).order('match_number'),
      supabase.from('teams').select('id, name, flag_emoji').order('name'),
      supabase.from('special_results').select('category, player_name, goals_scored, clean_sheets, is_winner'),
    ])

    if (matchesRes.data) setMatches(matchesRes.data as unknown as Match[])
    if (teamsRes.data) setTeams(teamsRes.data)
    if (specialsRes.data) {
      const map: Record<string, SpecialResult> = {}
      specialsRes.data.forEach(s => { map[s.category] = s })
      setSpecials(map)
    }
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

  async function clearResult(matchId: number) {
    if (!confirm('¿Borrar el resultado de este partido?')) return
    const supabase = createClient()
    await supabase.from('matches').update({ home_goals: null, away_goals: null }).eq('id', matchId)
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, home_goals: null, away_goals: null } : m))
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

  async function saveSpecial(category: string, field: string, value: any) {
    const supabase = createClient()
    await supabase.from('special_results').update({ [field]: value }).eq('category', category)
    setSpecials(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }))
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
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Guarda los resultados y recalcula los puntos</p>
        </div>
        <button onClick={calculatePoints} disabled={calculating} style={{
          background: calculating ? 'rgba(201,168,76,0.2)' : 'linear-gradient(90deg, #C9A84C, #b8962a)',
          border: 'none', borderRadius: '8px', padding: '10px 18px',
          color: '#05080F', fontSize: '12px', fontWeight: 600,
          cursor: calculating ? 'wait' : 'pointer', flexShrink: 0,
        }}>
          {calculating ? 'Calculando...' : '⚡ Recalcular puntos'}
        </button>
      </div>

      {/* Tabs principales */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('matches')} style={{
          fontSize: '11px', padding: '10px 16px', background: 'none', border: 'none',
          color: activeTab === 'matches' ? '#C9A84C' : 'rgba(255,255,255,0.3)',
          borderBottom: activeTab === 'matches' ? '2px solid #C9A84C' : '2px solid transparent',
          cursor: 'pointer', letterSpacing: '0.5px',
        }}>⚽ Partidos</button>
        <button onClick={() => setActiveTab('specials')} style={{
          fontSize: '11px', padding: '10px 16px', background: 'none', border: 'none',
          color: activeTab === 'specials' ? '#C9A84C' : 'rgba(255,255,255,0.3)',
          borderBottom: activeTab === 'specials' ? '2px solid #C9A84C' : '2px solid transparent',
          cursor: 'pointer', letterSpacing: '0.5px',
        }}>🌟 Premios individuales</button>
      </div>

      {/* TAB: PARTIDOS */}
      {activeTab === 'matches' && (
        <>
          {/* Tabs de fase */}
          <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '0.5px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
            {PHASES.map(phase => (
              <button key={phase} onClick={() => setActivePhase(phase)} style={{
                fontSize: '10px', whiteSpace: 'nowrap',
                color: activePhase === phase ? '#C9A84C' : 'rgba(255,255,255,0.28)',
                padding: '10px 14px', letterSpacing: '0.5px', textTransform: 'uppercase',
                background: 'none', border: 'none',
                borderBottom: activePhase === phase ? '2px solid #C9A84C' : '2px solid transparent',
                cursor: 'pointer',
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
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>Jornada {j}</button>
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
                    onSaveResult={saveResult} onAssignTeam={assignTeam} onClearResult={clearResult} />
                ))}
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {phaseMatches.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>No hay partidos en esta fase aún</p>
                </div>
              ) : phaseMatches.map(match => (
                <AdminMatchRow key={match.id} match={match} teams={teams}
                  isSaving={saving === match.id} isSaved={saved === match.id}
                  onSaveResult={saveResult} onAssignTeam={assignTeam} onClearResult={clearResult} />
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB: PREMIOS INDIVIDUALES */}
      {activeTab === 'specials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Máximo goleador */}
          <SpecialCard
            emoji="⚽"
            title="Máximo goleador"
            color="#C9A84C"
            fields={[
              { label: 'Nombre del jugador', key: 'player_name', type: 'text', placeholder: 'Ej: Kylian Mbappé' },
              { label: 'Goles marcados en el torneo', key: 'goals_scored', type: 'number', placeholder: '0' },
              { label: 'Es el máximo goleador del torneo', key: 'is_winner', type: 'boolean' },
            ]}
            data={specials['top_scorer'] ?? { category: 'top_scorer', player_name: null, goals_scored: 0, clean_sheets: 0, is_winner: false }}
            onSave={(field, value) => saveSpecial('top_scorer', field, value)}
          />

          {/* Portero */}
          <SpecialCard
            emoji="🧤"
            title="Portero con más porterías a 0"
            color="#5b8ff9"
            fields={[
              { label: 'Nombre del portero', key: 'player_name', type: 'text', placeholder: 'Ej: Thibaut Courtois' },
              { label: 'Porterías a 0 (mín 60 min, sin prórroga)', key: 'clean_sheets', type: 'number', placeholder: '0' },
            ]}
            data={specials['goalkeeper'] ?? { category: 'goalkeeper', player_name: null, goals_scored: 0, clean_sheets: 0, is_winner: false }}
            onSave={(field, value) => saveSpecial('goalkeeper', field, value)}
          />

          {/* Mejor jugador */}
          <SpecialCard
            emoji="🌟"
            title="Mejor jugador del torneo"
            color="#C8102E"
            fields={[
              { label: 'Nombre del jugador', key: 'player_name', type: 'text', placeholder: 'Ej: Vinicius Jr.' },
              { label: 'Es el mejor jugador oficial del torneo', key: 'is_winner', type: 'boolean' },
            ]}
            data={specials['best_player'] ?? { category: 'best_player', player_name: null, goals_scored: 0, clean_sheets: 0, is_winner: false }}
            onSave={(field, value) => saveSpecial('best_player', field, value)}
          />

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 18px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
              💡 Introduce los datos y pulsa <strong style={{ color: '#C9A84C' }}>⚡ Recalcular puntos</strong> para actualizar la clasificación.
              El nombre del jugador debe coincidir exactamente con el que apostaron los participantes.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function SpecialCard({ emoji, title, color, fields, data, onSave }: {
  emoji: string; title: string; color: string
  fields: Array<{ label: string; key: string; type: 'text' | 'number' | 'boolean'; placeholder?: string }>
  data: SpecialResult
  onSave: (field: string, value: any) => void
}) {
  const [localData, setLocalData] = useState(data)
  useEffect(() => { setLocalData(data) }, [data])

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `0.5px solid rgba(255,255,255,0.06)`, borderLeft: `3px solid ${color}`, borderRadius: '12px', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ fontSize: '22px', fontFamily: "'Noto Color Emoji', sans-serif" }}>{emoji}</span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {fields.map(field => (
          <div key={field.key}>
            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
              {field.label}
            </label>
            {field.type === 'boolean' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {[true, false].map(val => (
                  <button key={String(val)} onClick={() => {
                    setLocalData(prev => ({ ...prev, [field.key]: val }))
                    onSave(field.key, val)
                  }} style={{
                    padding: '7px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                    background: localData[field.key as keyof SpecialResult] === val ? (val ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.06)') : 'rgba(255,255,255,0.03)',
                    border: `0.5px solid ${localData[field.key as keyof SpecialResult] === val ? (val ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.08)'}`,
                    color: localData[field.key as keyof SpecialResult] === val ? (val ? '#C9A84C' : 'rgba(255,255,255,0.5)') : 'rgba(255,255,255,0.3)',
                  }}>
                    {val ? '✓ Sí' : '✗ No'}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={field.type === 'number'
                  ? (localData[field.key as keyof SpecialResult] as number) ?? 0
                  : (localData[field.key as keyof SpecialResult] as string) ?? ''}
                onChange={e => setLocalData(prev => ({ ...prev, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                onBlur={e => onSave(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                  padding: '9px 14px', color: '#ffffff', fontSize: '13px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminMatchRow({ match, teams, isSaving, isSaved, onSaveResult, onAssignTeam, onClearResult }: {
  match: Match; teams: Team[]
  isSaving: boolean; isSaved: boolean
  onSaveResult: (id: number, h: number, a: number) => void
  onAssignTeam: (id: number, side: 'home' | 'away', teamId: number) => void
  onClearResult: (id: number) => void
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

  // Resultado 1X2
  const result1x2 = hasResult
    ? match.home_goals! > match.away_goals! ? '1' : match.home_goals! < match.away_goals! ? '2' : 'X'
    : null

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `0.5px solid ${isSaved ? 'rgba(201,168,76,0.4)' : hasResult ? 'rgba(26,86,196,0.2)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: '10px', padding: '12px 16px', marginBottom: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>P{match.match_number} · {date}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
          {result1x2 && (
            <span style={{ fontSize: '10px', color: '#C9A84C', background: 'rgba(201,168,76,0.15)', border: '0.5px solid rgba(201,168,76,0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              {result1x2}
            </span>
          )}
          {isSaving ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>...</span>
            : isSaved ? <span style={{ color: '#C9A84C' }}>✓</span>
            : hasResult ? (
              <button onClick={() => onClearResult(match.id)} style={{ fontSize: '11px', color: 'rgba(200,16,46,0.6)', background: 'none', border: '0.5px solid rgba(200,16,46,0.3)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>✕ Borrar</button>
            ) : null}
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
