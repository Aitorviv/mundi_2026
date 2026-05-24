// Deadline global: 1 hora antes del primer partido
// Primer partido: 11 junio 2026 a las 21:00 CEST → deadline 20:00 CEST
export const BET_DEADLINE = new Date('2026-06-11T18:00:00.000Z') // 20:00 CEST = 18:00 UTC

export function isBettingOpen(): boolean {
  return new Date() < BET_DEADLINE
}

export function getTimeRemaining(): {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
} {
  const now = new Date()
  const diff = BET_DEADLINE.getTime() - now.getTime()

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  }
}
