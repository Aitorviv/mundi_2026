import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ================================================
// SISTEMA DE PUNTUACIÓN
// ================================================
// Grupos:       1 pt por 1X2 correcto (calculado desde marcador apostado)
// 1/16:         2 pts por equipo que pasa acertado
// Octavos:      3 pts
// Cuartos:      4 pts
// Semis:        6 pts
// Final:        9 pts (finalista) + 12 pts (campeón)
// Goleador:     1 pt por gol + 1 pt extra si es el máximo goleador
// Portero:      1 pt por portería a 0 (mín 60 min, sin prórroga)
// Mejor jugador: 4 pts si acierta
// ================================================

const KNOCKOUT_POINTS: Record<string, number> = {
  r32: 2, r16: 3, qf: 4, sf: 6, final: 9,
}

function get1X2(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
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
      .select('id, match_id, home_goals_bet, away_goals_bet')
      .in('match_id', matchIds)

    if (matchBets?.length) {
      for (const bet of matchBets) {
        const match = resultsMap[bet.match_id]
        const real1X2 = get1X2(match.home_goals, match.away_goals)
        const bet1X2 = get1X2(bet.home_goals_bet, bet.away_goals_bet)
        const pts = real1X2 === bet1X2 ? 1 : 0
        await supabase.from('match_bets').update({ points_earned: pts }).eq('id', bet.id)
      }
    }
  }

  // ================================================
  // 2. PUNTOS DE ELIMINATORIAS (knockout_picks)
  // El admin asigna el equipo ganador real en cada partido eliminatorio
  // La puntuación se calcula comparando el pick del usuario con el ganador real
  // ================================================
  const { data: knockoutMatches } = await supabase
    .from('matches')
    .select('id, match_number, phase, home_team_id, away_team_id, home_goals, away_goals')
    .in('phase', ['r32', 'r16', 'qf', 'sf', 'final'])
    .not('home_goals', 'is', null)
    .not('away_goals', 'is', null)

  if (knockoutMatches?.length) {
    for (const match of knockoutMatches) {
      // El ganador es el equipo con más goles (no hay empate en eliminatorias)
      const winnerTeamId = match.home_goals > match.away_goals
        ? match.home_team_id
        : match.away_team_id

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
  // 3. PUNTOS ESPECIALES
  // ================================================
  const { data: specialResults } = await supabase
    .from('special_results')
    .select('category, player_name, goals_scored, clean_sheets, is_winner')

  if (specialResults?.length) {
    const { data: specialBets } = await supabase
      .from('special_bets')
      .select('id, participant_id, category, player_name')

    if (specialBets?.length) {
      for (const bet of specialBets) {
        const real = specialResults.find(r => r.category === bet.category)
        if (!real || !bet.player_name || !real.player_name) continue

        const nameMatch = bet.player_name.toLowerCase().trim() === real.player_name.toLowerCase().trim()
        let pts = 0

        if (bet.category === 'top_scorer') {
          if (nameMatch) pts = (real.goals_scored ?? 0) + (real.is_winner ? 1 : 0)
        } else if (bet.category === 'goalkeeper') {
          if (nameMatch) pts = real.clean_sheets ?? 0
        } else if (bet.category === 'best_player') {
          if (nameMatch && real.is_winner) pts = 4
        }

        await supabase.from('special_bets').update({ points_earned: pts }).eq('id', bet.id)
      }
    }
  }

  // ================================================
  // 4. RECALCULAR TOTAL POR PARTICIPANTE
  // ================================================
  const { data: participants } = await supabase
    .from('participants')
    .select('id')

  if (participants?.length) {
    for (const p of participants) {
      const [matchPts, knockoutPts, specialPts] = await Promise.all([
        supabase.from('match_bets').select('points_earned').eq('participant_id', p.id),
        supabase.from('knockout_picks').select('points_earned').eq('participant_id', p.id),
        supabase.from('special_bets').select('points_earned').eq('participant_id', p.id),
      ])

      const sum = (rows: any) => (rows.data ?? []).reduce((acc: number, r: any) => acc + (r.points_earned ?? 0), 0)
      const total = sum(matchPts) + sum(knockoutPts) + sum(specialPts)

      await supabase.from('participants').update({ total_points: total }).eq('id', p.id)
      totalUpdated++
    }
  }

  return NextResponse.json({ ok: true, updated: totalUpdated })
}
