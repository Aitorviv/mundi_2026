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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">

        {/* Logo / título */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold text-white">Porra Mundial 2026</h1>
          <p className="text-gray-400 text-sm mt-1">USA · México · Canadá</p>
        </div>

        {sent ? (
          <div className="bg-green-900/40 border border-green-700 rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">📧</div>
            <h2 className="text-white font-semibold mb-1">Revisa tu email</h2>
            <p className="text-gray-300 text-sm">
              Te hemos enviado un enlace mágico a{' '}
              <span className="text-white font-medium">{email}</span>.
              Haz clic en él para entrar.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-gray-400 text-xs underline hover:text-white"
            >
              Usar otro email
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Enviando...' : 'Entrar con magic link'}
            </button>

            <p className="text-gray-500 text-xs text-center">
              No necesitas contraseña. Te mandamos un enlace al email.
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
