'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
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
      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(5,8,20,0.92) 0%, rgba(13,18,40,0.88) 100%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '360px' }}>
        {/* Header */}
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

        {sent ? (
          <div style={{
            background: 'rgba(201,168,76,0.08)',
            border: '0.5px solid rgba(201,168,76,0.3)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', fontFamily: "'Noto Color Emoji', sans-serif", marginBottom: '12px' }}>📧</div>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>Revisa tu email</h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Hemos enviado un enlace mágico a{' '}
              <span style={{ color: '#C9A84C' }}>{email}</span>
            </p>
            <button
              onClick={() => setSent(false)}
              style={{ marginTop: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Usar otro email
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && <p style={{ fontSize: '12px', color: '#ff4d6a' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? 'rgba(200,16,46,0.3)' : 'linear-gradient(90deg, #C8102E, #9b0d22)',
                border: 'none',
                borderRadius: '8px',
                padding: '13px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
              }}
            >
              {loading ? 'Enviando...' : 'Entrar con magic link'}
            </button>

            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
              No necesitas contraseña — te mandamos un enlace al email
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
