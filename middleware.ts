import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Rutas públicas — siempre accesibles
  const publicRoutes = ['/login', '/auth', '/pendiente', '/onboarding']
  const isPublic = publicRoutes.some(route => pathname.startsWith(route))
  if (isPublic) return supabaseResponse

  // Sin sesión → login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Comprobar aprobación y rol
  const { data: participant } = await supabase
    .from('participants')
    .select('approved, is_admin')
    .eq('id', user.id)
    .single()

  // Sin perfil todavía → onboarding
  if (!participant) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // No aprobado → pendiente
  if (!participant.approved && !pathname.startsWith('/pendiente')) {
    const url = request.nextUrl.clone()
    url.pathname = '/pendiente'
    return NextResponse.redirect(url)
  }

  // Solo admins en /admin
  if (pathname.startsWith('/admin') && !participant.is_admin) {
    const url = request.nextUrl.clone()
    url.pathname = '/apuestas'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
