import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: participant } = await supabase
    .from('participants')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ minHeight: '100vh', background: '#05080F', backgroundImage: 'url(/bg-mundial.webp)', backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed' }}>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, rgba(5,8,20,0.7) 0%, rgba(5,8,20,0.95) 30%, rgba(5,8,20,0.98) 100%)' }}>
        <Nav isAdmin={participant?.is_admin ?? false} />
        <main style={{ maxWidth: '800px', margin: '0 auto', padding: '0 16px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
