import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Porra Mundial 2026',
  description: 'USA · México · Canadá',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${geist.className} bg-gray-950 text-white min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
