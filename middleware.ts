import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_COUNTRIES = ['ES'] // Solo España

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Comprobar país — Vercel añade este header automáticamente
  const country = request.headers.get('x-vercel-ip-country')

  // En desarrollo local no hay header de país — permitir siempre
  const isDev = process.env.NODE_ENV === 'development'

  if (!isDev && country && !ALLOWED_COUNTRIES.includes(country)) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Acceso restringido</title>
        <style>
          body { margin:0; background:#05080F; color:#fff; font-family:sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; text-align:center; padding:20px; }
          h1 { color:#C9A84C; font-size:22px; letter-spacing:2px; text-transform:uppercase; margin-bottom:12px; }
          p { color:rgba(255,255,255,0.4); font-size:14px; line-height:1.6; }
          .trophy { font-size:48px; margin-bottom:16px; }
        </style>
      </head>
      <body>
        <div>
          <div class="trophy">🏆</div>
          <h1>Acceso restringido</h1>
          <p>Esta aplicación no está disponible.</p>
          <p style="color:rgba(255,255,255,0.2);font-size:12px;margin-top:8px;">País detectado: ${country}</p>
        </div>
      </body>
      </html>`,
      {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    )
  }

  // Rutas públicas
  const publicRoutes = ['/login', '/api/auth', '/admin/restringido']
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

  // No admins en /admin → página de acceso restringido
  if (pathname.startsWith('/admin') && !parsed.is_admin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/restringido'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|bg-mundial.webp|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
