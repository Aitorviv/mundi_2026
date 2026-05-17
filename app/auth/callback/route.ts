import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Crear el perfil en participants si no existe
      await supabase.from('participants').upsert(
        {
          id: data.user.id,
          name: data.user.email?.split('@')[0] ?? 'Participante',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

      return NextResponse.redirect(`${origin}/apuestas`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
