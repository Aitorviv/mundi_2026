import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rutas públicas
  const publicRoutes = ['/login', '/api/auth']
  if (publicRoutes.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Leer cookie de sesión
  const session = request.cookies.get('porra_session')?.value
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  let parsed: { id: string; is_admin: boolean } | null = null
  try { parsed = JSON.parse(session) } catch { }

  if (!parsed) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Solo admins en /admin
  if (pathname.startsWith('/admin') && !parsed.is_admin) {
    const url = request.nextUrl.clone()
    url.pathname = '/apuestas'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|bg-mundial.webp|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
