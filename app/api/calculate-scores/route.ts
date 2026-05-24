import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const POINTS = {
  EXACT_SCORE: 3,
  CORRECT_WINNER: 1,
  CORRECT_POSITION: 2,
  CORRECT_TOP2: 1,
  CHAMPION: 10,
  RUNNER_UP: 6,
  THIRD: 4,
  GOLDEN_BOOT: 5,
  SILVER_BOOT: 3,
  BRONZE_BOOT: 3,
}

function matchPoints(betH: number, betA: number, realH: number, realA: number): number {
  if (betH === realH && betA === realA) return POINTS.EXACT_SCORE
  if (Math.sign(betH - betA) === Math.sign(realH - realA)) return POINTS.CORRECT_WINNER
  return 0
}

export async function POST() {
  const supabase = await createClient()

  // 1. Obtener todos los partidos con resultado
  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_goals, away_goals')
    .not('home_goals', 'is', null)
    .not('away_goals', 'is', null)

  if (!matches?.length) return NextResponse.json({ updated: 0 })

  const matchIds = matches.map(m => m.id)
  const resultsMap = Object.fromEntries(matches.map(m => [m.id, m]))

  // 2. Calcular puntos de apuestas de partidos
  const { data: matchBets } = await supabase
    .from('match_bets')
    .select('id, participant_id, match_id, home_goals_bet, away_goals_bet')
    .in('match_id', matchIds)

  if (matchBets?.length) {
    for (const bet of matchBets) {
      const result = resultsMap[bet.match_id]
      const pts = matchPoints(bet.home_goals_bet, bet.away_goals_bet, result.home_goals, result.away_goals)
      await supabase.from('match_bets').update({ points_earned: pts }).eq('id', bet.id)
    }
  }

  // 3. Calcular puntos de posiciones de grupo
  const { data: standings } = await supabase
    .from('group_standings')
    .select('group_name, position, team_id')

  if (standings?.length) {
    const { data: groupBets } = await supabase
      .from('group_position_bets')
      .select('id, participant_id, group_name, position, team_id')

    if (groupBets?.length) {
      for (const bet of groupBets) {
        const real = standings.find(s => s.group_name === bet.group_name && s.position === bet.position)
        let pts = 0
        if (real?.team_id === bet.team_id) {
          pts = POINTS.CORRECT_POSITION
        } else {
          // Verificar si el equipo está en top 2
          const top2 = standings.filter(s => s.group_name === bet.group_name && s.position <= 2).map(s => s.team_id)
          if (top2.includes(bet.team_id) && bet.position <= 2) pts = POINTS.CORRECT_TOP2
        }
        await supabase.from('group_position_bets').update({ points_earned: pts }).eq('id', bet.id)
      }
    }
  }

  // 4. Calcular puntos especiales
  const { data: specialResults } = await supabase
    .from('special_results')
    .select('category, team_id, player_name')

  if (specialResults?.length) {
    const { data: specialBets } = await supabase
      .from('special_bets')
      .select('id, category, team_id, player_name')

    if (specialBets?.length) {
      const specialPts: Record<string, number> = {
        champion: POINTS.CHAMPION, runner_up: POINTS.RUNNER_UP, third: POINTS.THIRD,
        golden_boot: POINTS.GOLDEN_BOOT, silver_boot: POINTS.SILVER_BOOT, bronze_boot: POINTS.BRONZE_BOOT,
      }

      for (const bet of specialBets) {
        const real = specialResults.find(r => r.category === bet.category)
        if (!real) continue
        let pts = 0
        if (bet.team_id && real.team_id === bet.team_id) pts = specialPts[bet.category] ?? 0
        if (bet.player_name && real.player_name &&
          bet.player_name.toLowerCase().trim() === real.player_name.toLowerCase().trim()) {
          pts = specialPts[bet.category] ?? 0
        }
        await supabase.from('special_bets').update({ points_earned: pts }).eq('id', bet.id)
      }
    }
  }

  // 5. Recalcular total de puntos por participante
  const { data: participants } = await supabase
    .from('participants')
    .select('id')

  let updated = 0
  if (participants?.length) {
    for (const p of participants) {
      await supabase.rpc('recalculate_participant_points', { p_id: p.id })
      updated++
    }
  }

  return NextResponse.json({ ok: true, updated })
}
