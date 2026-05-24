import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Nav from '@/components/Nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', background: '#05080F', backgroundImage: 'url(/bg-mundial.webp)', backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed' }}>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, rgba(5,8,20,0.7) 0%, rgba(5,8,20,0.95) 30%, rgba(5,8,20,0.98) 100%)' }}>
        <Nav isAdmin={session.is_admin} />
        <main style={{ maxWidth: '800px', margin: '0 auto', padding: '0 16px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
