import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Comprobar si ya tiene perfil
      const { data: existing } = await supabase
        .from('participants')
        .select('id, approved')
        .eq('id', data.user.id)
        .single()

      if (!existing) {
        // Nuevo usuario — crear perfil pendiente de aprobación
        await supabase.from('participants').insert({
          id: data.user.id,
          name: data.user.email?.split('@')[0] ?? 'Participante',
          display_name: null,
          approved: false,
          is_admin: false,
        })

        // Notificar al admin
        await fetch(`${origin}/api/notify-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: data.user.email }),
        }).catch(() => {})

        return NextResponse.redirect(`${origin}/pendiente`)
      }

      if (!existing.approved) {
        return NextResponse.redirect(`${origin}/pendiente`)
      }

      return NextResponse.redirect(`${origin}/apuestas`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
