import { NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!

export async function POST(request: Request) {
  const { userEmail } = await request.json()

  // Usamos la API de Resend (gratuita hasta 3000 emails/mes)
  // Alternativa: cualquier proveedor SMTP
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'porra@mundi-2026.vercel.app',
      to: ADMIN_EMAIL,
      subject: '🏆 Nueva solicitud en la Porra Mundial 2026',
      html: `
        <h2>Nueva solicitud de registro</h2>
        <p>El usuario <strong>${userEmail}</strong> quiere unirse a la porra.</p>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/participantes" 
             style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
            Aprobar en el panel admin →
          </a>
        </p>
      `,
    }),
  })

  if (!res.ok) {
    console.error('Error enviando email:', await res.text())
    return NextResponse.json({ error: 'Email error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
