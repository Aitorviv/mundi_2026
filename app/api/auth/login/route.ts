import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { username, pin } = await request.json()

  if (!username || !pin || pin.length !== 6) {
    return NextResponse.json({ error: 'Datos incorrectos' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: participant } = await supabase
    .from('participants')
    .select('id, username, pin, display_name, name, is_admin')
    .eq('username', username.toLowerCase().trim())
    .single()

  if (!participant || !participant.pin) {
    return NextResponse.json({ error: 'Usuario o PIN incorrecto' }, { status: 401 })
  }

  const pinValid = await bcrypt.compare(pin, participant.pin)
  if (!pinValid) {
    return NextResponse.json({ error: 'Usuario o PIN incorrecto' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('porra_session', JSON.stringify({
    id: participant.id,
    username: participant.username,
    name: participant.display_name || participant.name,
    is_admin: participant.is_admin,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return NextResponse.json({ ok: true })
}
