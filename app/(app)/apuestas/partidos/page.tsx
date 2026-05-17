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

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Cargar partidos de grupos con equipos
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        id, match_number, group_name, matchday, played_at, locked_at,
        home_team:home_team_id(id, name, flag_emoji),
        away_team:away_team_id(id, name, flag_emoji)
      `)
      .eq('phase', 'group')
      .order('match_number')

    // Cargar apuestas existentes
    const { data: betsData } = await supabase
      .from('match_bets')
      .select('match_id, home_goals_bet, away_goals_bet')
      .eq('participant_id', user.id)

    if (matchesData) setMatches(matchesData as unknown as Match[])

    if (betsData) {
      const betsMap: Record<number, Bet> = {}
      betsData.forEach(b => { betsMap[b.match_id] = b })
      setBets(betsMap)
    }

    setLoading(false)
  }

  async function saveBet(matchId: number, home: number, away: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(matchId)

    await supabase.from('match_bets').upsert(
      {
        participant_id: user.id,
        match_id: matchId,
        home_goals_bet: home,
        away_goals_bet: away,
      },
      { onConflict: 'participant_id,match_id' }
    )

    setBets(prev => ({ ...prev, [matchId]: { match_id: matchId, home_goals_bet: home, away_goals_bet: away } }))
    setSaving(null)
    setSaved(matchId)
    setTimeout(() => setSaved(null), 1500)
  }

  function isLocked(lockedAt: string) {
    return new Date(lockedAt) < new Date()
  }

  const matchdays = [1, 2, 3]
  const filtered = matches.filter(m => m.matchday === activeMatchday)
  const groups = [...new Set(filtered.map(m => m.group_name))].sort()

  const totalBets = Object.keys(bets).length
  const totalMatches = matches.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Cargando partidos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">⚽ Resultados de partidos</h1>
          <p className="text-gray-400 text-sm mt-1">
            {totalBets} / {totalMatches} partidos apostados
          </p>
        </div>
        {/* Barra de progreso */}
        <div className="hidden sm:block w-32">
          <div className="bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${totalMatches ? (totalBets / totalMatches) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">
            {totalMatches ? Math.round((totalBets / totalMatches) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Selector de jornada */}
      <div className="flex gap-2">
        {matchdays.map(j => (
          <button
            key={j}
            onClick={() => setActiveMatchday(j)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeMatchday === j
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            Jornada {j}
          </button>
        ))}
      </div>

      {/* Partidos por grupo */}
      {groups.map(group => (
        <div key={group}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Grupo {group}
          </h2>
          <div className="space-y-2">
            {filtered
              .filter(m => m.group_name === group)
              .map(match => {
                const bet = bets[match.id]
                const locked = isLocked(match.locked_at)
                const isSaving = saving === match.id
                const isSaved = saved === match.id

                return (
                  <MatchRow
                    key={match.id}
                    match={match}
                    bet={bet}
                    locked={locked}
                    isSaving={isSaving}
                    isSaved={isSaved}
                    onSave={saveBet}
                  />
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}

function MatchRow({
  match,
  bet,
  locked,
  isSaving,
  isSaved,
  onSave,
}: {
  match: Match
  bet?: Bet
  locked: boolean
  isSaving: boolean
  isSaved: boolean
  onSave: (matchId: number, home: number, away: number) => void
}) {
  const [home, setHome] = useState(bet?.home_goals_bet ?? '')
  const [away, setAway] = useState(bet?.away_goals_bet ?? '')

  // Actualizar si llegan datos del padre
  useEffect(() => {
    if (bet) {
      setHome(bet.home_goals_bet)
      setAway(bet.away_goals_bet)
    }
  }, [bet])

  const date = new Date(match.played_at).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  const canSave = home !== '' && away !== '' && !locked && !isSaving

  return (
    <div className={`bg-gray-900 border rounded-xl px-4 py-3 transition-colors ${
      isSaved ? 'border-green-600' : bet ? 'border-gray-700' : 'border-gray-800'
    }`}>
      <div className="flex items-center gap-3">

        {/* Equipo local */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-sm font-medium text-right hidden sm:block">
            {match.home_team.name}
          </span>
          <span className="text-xl">{match.home_team.flag_emoji}</span>
        </div>

        {/* Inputs del marcador */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            min="0"
            max="20"
            disabled={locked}
            value={home}
            onChange={e => setHome(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => {
              if (home !== '' && away !== '' && !locked) {
                onSave(match.id, Number(home), Number(away))
              }
            }}
            className="w-12 h-10 text-center text-lg font-bold bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <span className="text-gray-500 font-bold">-</span>
          <input
            type="number"
            min="0"
            max="20"
            disabled={locked}
            value={away}
            onChange={e => setAway(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => {
              if (home !== '' && away !== '' && !locked) {
                onSave(match.id, Number(home), Number(away))
              }
            }}
            className="w-12 h-10 text-center text-lg font-bold bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>

        {/* Equipo visitante */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">{match.away_team.flag_emoji}</span>
          <span className="text-sm font-medium hidden sm:block">
            {match.away_team.name}
          </span>
        </div>

        {/* Estado */}
        <div className="w-8 text-center shrink-0">
          {locked ? (
            <span title="Cerrado">🔒</span>
          ) : isSaving ? (
            <span className="text-gray-500 text-xs">...</span>
          ) : isSaved ? (
            <span className="text-green-400">✓</span>
          ) : bet ? (
            <span className="text-blue-400 text-xs">✓</span>
          ) : null}
        </div>
      </div>

      {/* Fecha */}
      <p className="text-xs text-gray-600 mt-1.5 text-center">{date}</p>
    </div>
  )
}
