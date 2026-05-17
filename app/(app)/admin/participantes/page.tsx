import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ApproveButton from './ApproveButton'

export default async function AdminParticipantesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('participants')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!me?.is_admin) redirect('/apuestas')

  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, display_name, approved, is_admin, total_points, created_at')
    .order('created_at', { ascending: false })

  const pending = participants?.filter(p => !p.approved) ?? []
  const approved = participants?.filter(p => p.approved) ?? []

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">⚙️ Participantes</h1>

      {/* Pendientes */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-3">
            Pendientes de aprobación ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="bg-gray-900 border border-yellow-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{p.display_name || p.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {new Date(p.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <ApproveButton participantId={p.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aprobados */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Aprobados ({approved.length})
        </h2>
        <div className="space-y-2">
          {approved.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-white font-medium flex items-center gap-2">
                  {p.display_name || p.name}
                  {p.is_admin && <span className="text-xs bg-orange-600 px-1.5 py-0.5 rounded">admin</span>}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">{p.total_points} puntos</p>
              </div>
              <span className="text-green-400 text-sm">✓ Aprobado</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
