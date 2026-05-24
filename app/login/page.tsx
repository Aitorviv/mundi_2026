'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim().toLowerCase(), pin }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Usuario o PIN incorrecto')
      setLoading(false)
      return
    }

    router.push('/apuestas')
    router.refresh()
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#05080F',
      backgroundImage: 'url(/bg-mundial.webp)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(5,8,20,0.92) 0%, rgba(13,18,40,0.88) 100%)' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '52px', fontFamily: "'Noto Color Emoji', sans-serif", lineHeight: 1, marginBottom: '12px' }}>🏆</div>
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Mundial 2026
          </h1>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            USA · México · Canadá
          </p>
          <div style={{ width: '40px', height: '2px', background: 'linear-gradient(90deg, #1A56C4, #C8102E)', margin: '12px auto 0', borderRadius: '2px' }} />
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Nombre de usuario
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="tunombre"
              autoComplete="username"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                padding: '12px 16px', color: '#ffffff', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
              PIN (6 dígitos)
            </label>
            <input
              type="password"
              required
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              maxLength={6}
              inputMode="numeric"
              autoComplete="current-password"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                padding: '12px 16px', color: '#ffffff', fontSize: '20px',
                letterSpacing: '8px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '12px', color: '#ff4d6a', textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            style={{
              width: '100%',
              background: loading || pin.length !== 6 ? 'rgba(200,16,46,0.3)' : 'linear-gradient(90deg, #C8102E, #9b0d22)',
              border: 'none', borderRadius: '8px', padding: '13px',
              color: '#ffffff', fontSize: '12px', fontWeight: 500,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: loading || pin.length !== 6 ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
