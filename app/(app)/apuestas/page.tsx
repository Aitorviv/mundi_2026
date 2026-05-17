import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ApuestasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: participant } = await supabase
    .from('participants')
    .select('name, total_points')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold">Mis apuestas</h1>
        <p className="text-gray-400 text-sm mt-1">
          Hola, <span className="text-white">{participant?.name}</span> · {participant?.total_points ?? 0} puntos
        </p>
      </div>

      {/* Secciones de apuestas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <a
          href="/apuestas/partidos"
          className="bg-gray-900 border border-gray-800 hover:border-blue-500 rounded-xl p-5 transition-colors group"
        >
          <div className="text-3xl mb-3">⚽</div>
          <h2 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
            Resultados de partidos
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Apuesta el marcador exacto de los 72 partidos de grupos
          </p>
          <div className="mt-3 text-xs text-blue-400">3 pts resultado exacto · 1 pt ganador</div>
        </a>

        <a
          href="/apuestas/grupos"
          className="bg-gray-900 border border-gray-800 hover:border-blue-500 rounded-xl p-5 transition-colors group"
        >
          <div className="text-3xl mb-3">📊</div>
          <h2 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
            Posiciones de grupo
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            ¿Quién queda 1º, 2º, 3º y 4º en cada uno de los 12 grupos?
          </p>
          <div className="mt-3 text-xs text-blue-400">2 pts posición exacta · 1 pt top 2</div>
        </a>

        <a
          href="/apuestas/especiales"
          className="bg-gray-900 border border-gray-800 hover:border-blue-500 rounded-xl p-5 transition-colors group"
        >
          <div className="text-3xl mb-3">🌟</div>
          <h2 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
            Apuestas especiales
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Campeón, subcampeón, 3º puesto, bota de oro y balón de oro
          </p>
          <div className="mt-3 text-xs text-blue-400">Hasta 10 pts por acierto</div>
        </a>
      </div>
    </div>
  )
}
