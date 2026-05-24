import { cookies } from 'next/headers'

export type Session = {
  id: string
  username: string
  name: string
  is_admin: boolean
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('porra_session')?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}
