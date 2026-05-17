'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PendientePage() {
  const [checking, setChecking] = useState(false)
  const [email, setEmail] = useState('')
  const [resent, setResent] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Guardar el email del usuario para poder reenviar magic link
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  async function checkApproval() {
    setChecking(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('participants')
      .select('approved')
      .eq('id', user.id)
      .single()

    if (data?.approved) {
      router.push('/apuestas')
    } else {
      setChecking(false)
      alert('Aún no has sido aprobado. El admin recibirá un aviso en breve.')
    }
  }

  async function resendMagicLink() {
    if (!email) return
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setResent(true)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-5xl">⏳</div>
        <h1 className="text-2xl font-bold text-white">Solicitud enviada</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Tu registro está pendiente de aprobación. El administrador recibirá
          un aviso y te dará acceso en breve.
        </p>

        {/* Botón para comprobar si ya fue aprobado */}
        <button
          onClick={checkApproval}
          disabled={checking}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {checking ? 'Comprobando...' : '¿Ya me aprobaron? Entrar →'}
        </button>

        {/* Reenviar magic link */}
        <div className="pt-2 border-t border-gray-800">
          <p className="text-gray-500 text-xs mb-2">
            ¿El enlace del email ha caducado?
          </p>
          {resent ? (
            <p className="text-green-400 text-sm">✓ Enlace reenviado a {email}</p>
          ) : (
            <button
              onClick={resendMagicLink}
              className="text-blue-400 hover:text-blue-300 text-sm underline transition-colors"
            >
              Reenviar magic link
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
