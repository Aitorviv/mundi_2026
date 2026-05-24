import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getSession()
  if (!session?.is_admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const supabase = await createClient()
  const { data } = await supabase
    .from('participants')
    .select('id, username, name, display_name, is_admin, total_points')
    .order('total_points', { ascending: false })

  return NextResponse.json({ participants: data ?? [] })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.is_admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { username, name, pin } = await request.json()

  if (!username || !name || !pin || pin.length !== 6) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const hashedPin = await bcrypt.hash(pin, 10)
  const supabase = await createClient()

  const { error } = await supabase.from('participants').insert({
    username: username.toLowerCase().trim(),
    name,
    display_name: name,
    pin: hashedPin,
    is_admin: false,
    approved: true,
    total_points: 0,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ese nombre de usuario ya existe' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session?.is_admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const supabase = await createClient()
  await supabase.from('participants').delete().eq('id', id).eq('is_admin', false)

  return NextResponse.json({ ok: true })
}
