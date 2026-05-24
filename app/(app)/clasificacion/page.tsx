import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type Participant = {
  id: string
  name: string
  display_name: string | null
  total_points: number
  is_admin: boolean
}

export default async function ClasificacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, display_name, total_points, is_admin')
    .eq('approved', true)
    .order('total_points', { ascending: false })

  const list: Participant[] = participants ?? []
  const myPos = list.findIndex(p => p.id === user.id) + 1
  const me = list.find(p => p.id === user.id)

  const maxPoints = list[0]?.total_points ?? 0

  const medalColors: Record<number, string> = {
    1: '#C9A84C',
    2: '#9BA7B0',
    3: '#C8102E',
  }

  const posEmoji: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
  }

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>
          Clasificación
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>
          Ranking
        </h1>
        {me && (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            Tu posición: <span style={{ color: '#C9A84C', fontWeight: 500 }}>#{myPos}</span>
            {' · '}
            <span style={{ color: '#ffffff' }}>{me.total_points} pts</span>
            {' de '}{list.length} participantes
          </p>
        )}
      </div>

      {/* Podio top 3 */}
      {list.length >= 3 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {/* 2º */}
          <PodiumCard participant={list[1]} position={2} color={medalColors[2]} isMe={list[1].id === user.id} maxPoints={maxPoints} height={80} />
          {/* 1º */}
          <PodiumCard participant={list[0]} position={1} color={medalColors[1]} isMe={list[0].id === user.id} maxPoints={maxPoints} height={110} />
          {/* 3º */}
          <PodiumCard participant={list[2]} position={3} color={medalColors[3]} isMe={list[2].id === user.id} maxPoints={maxPoints} height={60} />
        </div>
      )}

      {/* Lista completa */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {list.map((participant, idx) => {
          const position = idx + 1
          const isMe = participant.id === user.id
          const pct = maxPoints > 0 ? (participant.total_points / maxPoints) * 100 : 0
          const name = participant.display_name || participant.name

          return (
            <div
              key={participant.id}
              style={{
                background: isMe ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
                border: `0.5px solid ${isMe ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}
            >
              {/* Posición */}
              <div style={{ width: '32px', textAlign: 'center', flexShrink: 0 }}>
                {position <= 3 ? (
                  <span style={{ fontSize: '18px', fontFamily: "'Noto Color Emoji', sans-serif" }}>{posEmoji[position]}</span>
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>#{position}</span>
                )}
              </div>

              {/* Nombre y barra */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', fontWeight: isMe ? 500 : 400, color: isMe ? '#C9A84C' : 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </span>
                  {isMe && (
                    <span style={{ fontSize: '9px', color: '#C9A84C', background: 'rgba(201,168,76,0.15)', border: '0.5px solid rgba(201,168,76,0.3)', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                      TÚ
                    </span>
                  )}
                  {participant.is_admin && (
                    <span style={{ fontSize: '9px', color: '#C8102E', background: 'rgba(200,16,46,0.1)', border: '0.5px solid rgba(200,16,46,0.2)', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                      ADMIN
                    </span>
                  )}
                </div>
                {/* Barra de progreso */}
                <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: position === 1
                      ? 'linear-gradient(90deg, #C9A84C, #f0d080)'
                      : position === 2
                      ? 'linear-gradient(90deg, #9BA7B0, #c5d0d8)'
                      : position === 3
                      ? 'linear-gradient(90deg, #C8102E, #ff4d6a)'
                      : isMe
                      ? 'rgba(201,168,76,0.5)'
                      : 'rgba(26,86,196,0.4)',
                    borderRadius: '2px',
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>

              {/* Puntos */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: position === 1 ? '#C9A84C' : isMe ? '#C9A84C' : 'rgba(255,255,255,0.8)' }}>
                  {participant.total_points}
                </div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  pts
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px', fontFamily: "'Noto Color Emoji', sans-serif" }}>🏅</div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
            Aún no hay participantes aprobados
          </p>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px', marginTop: '20px' }}>
        Se actualiza cuando el admin introduce resultados y recalcula puntos
      </p>
    </div>
  )
}

function PodiumCard({ participant, position, color, isMe, maxPoints, height }: {
  participant: Participant; position: number; color: string
  isMe: boolean; maxPoints: number; height: number
}) {
  const name = participant.display_name || participant.name
  const posEmoji: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '22px', fontFamily: "'Noto Color Emoji', sans-serif" }}>{posEmoji[position]}</span>
      <div style={{
        fontSize: '12px', fontWeight: 500,
        color: isMe ? color : 'rgba(255,255,255,0.8)',
        textAlign: 'center', maxWidth: '80px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {name}
      </div>
      <div style={{
        width: '100%', height: `${height}px`,
        background: `linear-gradient(180deg, ${color}30 0%, ${color}10 100%)`,
        border: `0.5px solid ${color}40`,
        borderRadius: '8px 8px 0 0',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '2px',
      }}>
        <span style={{ fontSize: '18px', fontWeight: 700, color }}>{participant.total_points}</span>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', textTransform: 'uppercase' }}>pts</span>
      </div>
    </div>
  )
}
