import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
  home_team?: Team
  away_team?: Team
}

const PHASE_LABELS: Record<string, string> = {
  group: 'Grupos', r32: '1/16', r16: 'Octavos', qf: 'Cuartos', sf: 'Semis', '3rd': '3º-4º', final: 'Final'
}

export default async function PartidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: matchesData } = await supabase
    .from('matches')
    .select(`id, match_number, phase, group_name, matchday, played_at, home_goals, away_goals,
      home_team:home_team_id(id, name, flag_emoji),
      away_team:away_team_id(id, name, flag_emoji)`)
    .order('match_number')

  const matches: Match[] = (matchesData ?? []) as unknown as Match[]

  const now = new Date()
  const played = matches.filter(m => m.home_goals !== null && m.away_goals !== null)
  const upcoming = matches.filter(m => m.home_goals === null && new Date(m.played_at) > now)
  const groupMatches = matches.filter(m => m.phase === 'group')
  const elimMatches = matches.filter(m => m.phase !== 'group' && (m.home_team || m.away_team))

  // Agrupar fase de grupos por jornada y grupo
  const byMatchday: Record<number, Record<string, Match[]>> = {}
  for (const m of groupMatches) {
    const jornada = m.matchday ?? 1
    const group = m.group_name ?? '?'
    if (!byMatchday[jornada]) byMatchday[jornada] = {}
    if (!byMatchday[jornada][group]) byMatchday[jornada][group] = []
    byMatchday[jornada][group].push(m)
  }

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '9px', color: '#5b8ff9', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>
          Resultados
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Partidos</h1>
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ color: '#C9A84C', fontWeight: 500 }}>{played.length}</span> jugados
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{upcoming.length}</span> pendientes
          </div>
        </div>
      </div>

      {/* Fase de grupos */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Fase de grupos
          <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' }} />
        </div>

        {[1, 2, 3].map(jornada => {
          const jornMatches = byMatchday[jornada]
          if (!jornMatches) return null
          const groups = Object.keys(jornMatches).sort()
          const jPlayed = groups.flatMap(g => jornMatches[g]).filter(m => m.home_goals !== null).length
          const jTotal = groups.flatMap(g => jornMatches[g]).length

          return (
            <div key={jornada} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Jornada {jornada}
                </span>
                <span style={{ fontSize: '10px', color: jPlayed === jTotal ? '#C9A84C' : 'rgba(255,255,255,0.2)' }}>
                  {jPlayed}/{jTotal}
                </span>
                <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {groups.map(group => (
                <div key={group} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '9px', color: '#5b8ff9', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '2px' }}>
                    Grupo {group}
                  </div>
                  {jornMatches[group].map(match => (
                    <MatchResult key={match.id} match={match} />
                  ))}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Eliminatorias */}
      {elimMatches.length > 0 && (
        <div>
          <div style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Fase eliminatoria
            <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(200,16,46,0.3), transparent)' }} />
          </div>

          {['r32', 'r16', 'qf', 'sf', '3rd', 'final'].map(phase => {
            const phaseMs = elimMatches.filter(m => m.phase === phase)
            if (!phaseMs.length) return null
            return (
              <div key={phase} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {PHASE_LABELS[phase]}
                </div>
                {phaseMs.map(match => (
                  <MatchResult key={match.id} match={match} />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MatchResult({ match }: { match: Match }) {
  const hasResult = match.home_goals !== null && match.away_goals !== null
  const played = new Date(match.played_at) < new Date()

  const date = new Date(match.played_at).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })

  const homeWin = hasResult && match.home_goals! > match.away_goals!
  const awayWin = hasResult && match.away_goals! > match.home_goals!
  const draw = hasResult && match.home_goals === match.away_goals

  return (
    <div style={{
      background: hasResult ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
      border: `0.5px solid ${hasResult ? 'rgba(26,86,196,0.2)' : 'rgba(255,255,255,0.04)'}`,
      borderRadius: '8px', padding: '9px 14px', marginBottom: '4px',
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      {/* Local */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end' }}>
        <span style={{
          fontSize: '12px',
          color: homeWin ? '#ffffff' : 'rgba(255,255,255,0.5)',
          fontWeight: homeWin ? 500 : 400,
          textAlign: 'right',
        }} className="hidden sm:block">
          {match.home_team?.name ?? 'Por determinar'}
        </span>
        {match.home_team && (
          <span className="flag-emoji" style={{ fontSize: '16px', lineHeight: 1 }}>{match.home_team.flag_emoji}</span>
        )}
      </div>

      {/* Resultado o fecha */}
      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '64px' }}>
        {hasResult ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: homeWin ? '#C9A84C' : draw ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)' }}>
              {match.home_goals}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>–</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: awayWin ? '#C9A84C' : draw ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)' }}>
              {match.away_goals}
            </span>
          </div>
        ) : played ? (
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.5px' }}>Sin resultado</span>
        ) : (
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.3px' }}>{date}</div>
          </div>
        )}
        {hasResult && (
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px', marginTop: '2px' }}>{date}</div>
        )}
      </div>

      {/* Visitante */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
        {match.away_team && (
          <span className="flag-emoji" style={{ fontSize: '16px', lineHeight: 1 }}>{match.away_team.flag_emoji}</span>
        )}
        <span style={{
          fontSize: '12px',
          color: awayWin ? '#ffffff' : 'rgba(255,255,255,0.5)',
          fontWeight: awayWin ? 500 : 400,
        }} className="hidden sm:block">
          {match.away_team?.name ?? 'Por determinar'}
        </span>
      </div>
    </div>
  )
}
