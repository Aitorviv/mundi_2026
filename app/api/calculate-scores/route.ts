import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ================================================
// SISTEMA DE PUNTUACIÓN
// ================================================
// Grupos:       1 pt por 1X2 correcto
// 1/16:         2 pts por equipo que pasa acertado
// Octavos:      3 pts
// Cuartos:      4 pts
// Semis:        6 pts
// Final:        9 pts
// Campeón:      12 pts (ganador de la final)
// Goleador:     1 pt por gol + 1 pt extra si es el máximo goleador
// Portero:      1 pt por portería a 0 (mín 60 min, sin prórroga)
// Mejor jugador: 4 pts si acierta
// ================================================

const KNOCKOUT_POINTS: Record<string, number> = {
  r32:   2,
  r16:   3,
  qf:    4,
  sf:    6,
  final: 9,
}

function getResult(homeGoals: number, awayGoals: number): 'home' | 'draw' | 'away' {
  if (homeGoals > awayGoals) return 'home'
  if (homeGoals < awayGoals) return 'away'
  return 'draw'
}

export async function POST() {
  const supabase = await createClient()
  let totalUpdated = 0

  // ================================================
  // 1. PUNTOS DE PARTIDOS DE GRUPOS (1X2)
  // ================================================
  const { data: groupMatches } = await supabase
    .from('matches')
    .select('id, home_goals, away_goals')
    .eq('phase', 'group')
    .not('home_goals', 'is', null)
    .not('away_goals', 'is', null)

  if (groupMatches?.length) {
    const matchIds = groupMatches.map(m => m.id)
    const resultsMap = Object.fromEntries(groupMatches.map(m => [m.id, m]))

    const { data: matchBets } = await supabase
      .from('match_bets')
      .select('id, match_id, result_bet')
      .in('match_id', matchIds)

    if (matchBets?.length) {
      for (const bet of matchBets) {
        const match = resultsMap[bet.match_id]
        const realResult = getResult(match.home_goals, match.away_goals)
        const pts = bet.result_bet === realResult ? 1 : 0
        await supabase.from('match_bets').update({ points_earned: pts }).eq('id', bet.id)
      }
    }
  }

  // ================================================
  // 2. PUNTOS DE POSICIONES DE GRUPO
  // ================================================
  const { data: standings } = await supabase
    .from('group_standings')
    .select('group_name, position, team_id')

  if (standings?.length) {
    const { data: groupBets } = await supabase
      .from('group_position_bets')
      .select('id, group_name, position, team_id')

    if (groupBets?.length) {
      for (const bet of groupBets) {
        const real = standings.find(s => s.group_name === bet.group_name && s.position === bet.position)
        let pts = 0
        if (real?.team_id === bet.team_id) {
          pts = 2 // posición exacta
        } else {
          const top2 = standings
            .filter(s => s.group_name === bet.group_name && s.position <= 2)
            .map(s => s.team_id)
          if (top2.includes(bet.team_id) && bet.position <= 2) pts = 1
        }
        await supabase.from('group_position_bets').update({ points_earned: pts }).eq('id', bet.id)
      }
    }
  }

  // ================================================
  // 3. PUNTOS DE ELIMINATORIAS (knockout_picks)
  // ================================================
  const { data: knockoutMatches } = await supabase
    .from('matches')
    .select('id, match_number, phase, home_team_id, away_team_id, home_goals, away_goals')
    .in('phase', ['r32', 'r16', 'qf', 'sf', 'final'])
    .not('home_goals', 'is', null)
    .not('away_goals', 'is', null)

  if (knockoutMatches?.length) {
    for (const match of knockoutMatches) {
      // El equipo que pasa es el ganador (no hay empate en eliminatorias)
      const winnerTeamId = match.home_goals > match.away_goals
        ? match.home_team_id
        : match.away_team_id

      // Para la final, el campeón es el ganador y puntúa 12 pts adicionales
      const basePoints = KNOCKOUT_POINTS[match.phase] ?? 0
      const isFinal = match.phase === 'final'

      const { data: picks } = await supabase
        .from('knockout_picks')
        .select('id, team_id')
        .eq('match_number', match.match_number)

      if (picks?.length) {
        for (const pick of picks) {
          let pts = 0
          if (pick.team_id === winnerTeamId) {
            pts = basePoints
            if (isFinal) pts += 12 // bonus campeón
          }
          await supabase.from('knockout_picks').update({ points_earned: pts }).eq('id', pick.id)
        }
      }
    }
  }

  // ================================================
  // 4. PUNTOS ESPECIALES
  // ================================================
  const { data: specialResults } = await supabase
    .from('special_results')
    .select('category, player_name, goals_scored, clean_sheets, is_winner')

  if (specialResults?.length) {
    const { data: specialBets } = await supabase
      .from('special_bets')
      .select('id, category, player_name')

    if (specialBets?.length) {
      for (const bet of specialBets) {
        const real = specialResults.find(r => r.category === bet.category)
        if (!real || !bet.player_name || !real.player_name) continue

        const nameMatch = bet.player_name.toLowerCase().trim() === real.player_name.toLowerCase().trim()
        let pts = 0

        if (bet.category === 'top_scorer') {
          // 1 pt por cada gol del jugador apostado + 1 pt extra si es el máximo goleador
          if (nameMatch) {
            pts = (real.goals_scored ?? 0) + (real.is_winner ? 1 : 0)
          }
        } else if (bet.category === 'goalkeeper') {
          // 1 pt por cada portería a 0
          if (nameMatch) {
            pts = real.clean_sheets ?? 0
          }
        } else if (bet.category === 'best_player') {
          // 4 pts si acierta el mejor jugador
          if (nameMatch && real.is_winner) {
            pts = 4
          }
        }

        await supabase.from('special_bets').update({ points_earned: pts }).eq('id', bet.id)
      }
    }
  }

  // ================================================
  // 5. RECALCULAR TOTAL POR PARTICIPANTE
  // ================================================
  const { data: participants } = await supabase
    .from('participants')
    .select('id')

  if (participants?.length) {
    for (const p of participants) {
      // Sumar todos los puntos
      const [matchPts, groupPts, knockoutPts, specialPts] = await Promise.all([
        supabase.from('match_bets').select('points_earned').eq('participant_id', p.id),
        supabase.from('group_position_bets').select('points_earned').eq('participant_id', p.id),
        supabase.from('knockout_picks').select('points_earned').eq('participant_id', p.id),
        supabase.from('special_bets').select('points_earned').eq('participant_id', p.id),
      ])

      const sum = (rows: any) => (rows.data ?? []).reduce((acc: number, r: any) => acc + (r.points_earned ?? 0), 0)
      const total = sum(matchPts) + sum(groupPts) + sum(knockoutPts) + sum(specialPts)

      await supabase.from('participants').update({ total_points: total }).eq('id', p.id)
      totalUpdated++
    }
  }

  return NextResponse.json({ ok: true, updated: totalUpdated })
}
