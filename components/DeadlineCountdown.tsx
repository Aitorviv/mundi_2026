'use client'

import { useEffect, useState } from 'react'
import { getTimeRemaining, BET_DEADLINE } from '@/lib/deadline'

export default function DeadlineCountdown() {
  const [time, setTime] = useState(getTimeRemaining())

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const deadlineStr = BET_DEADLINE.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })

  if (time.expired) {
    return (
      <div style={{
        background: 'rgba(200,16,46,0.08)',
        border: '0.5px solid rgba(200,16,46,0.3)',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '20px',
      }}>
        <span style={{ fontSize: '18px', fontFamily: "'Noto Color Emoji', sans-serif" }}>🔒</span>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#ff4d6a' }}>Plazo cerrado</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
            Las apuestas se cerraron el {deadlineStr}
          </div>
        </div>
      </div>
    )
  }

  const isUrgent = time.days === 0 && time.hours < 24

  return (
    <div style={{
      background: isUrgent ? 'rgba(200,16,46,0.08)' : 'rgba(201,168,76,0.06)',
      border: `0.5px solid ${isUrgent ? 'rgba(200,16,46,0.3)' : 'rgba(201,168,76,0.2)'}`,
      borderRadius: '10px',
      padding: '12px 16px',
      marginBottom: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', fontFamily: "'Noto Color Emoji', sans-serif" }}>
            {isUrgent ? '⚠️' : '⏱️'}
          </span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: isUrgent ? '#ff4d6a' : '#C9A84C' }}>
              {isUrgent ? '¡Última oportunidad!' : 'Plazo para apostar'}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>
              Cierra el {deadlineStr}
            </div>
          </div>
        </div>

        {/* Cuenta atrás */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {time.days > 0 && (
            <TimeUnit value={time.days} label="días" urgent={isUrgent} />
          )}
          <TimeUnit value={time.hours} label="horas" urgent={isUrgent} />
          <TimeUnit value={time.minutes} label="min" urgent={isUrgent} />
          <TimeUnit value={time.seconds} label="seg" urgent={isUrgent} />
        </div>
      </div>
    </div>
  )
}

function TimeUnit({ value, label, urgent }: { value: number; label: string; urgent: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '18px', fontWeight: 700,
        color: urgent ? '#ff4d6a' : '#C9A84C',
        lineHeight: 1, minWidth: '28px',
      }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  )
}
