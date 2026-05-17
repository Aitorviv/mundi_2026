export default function PendientePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-white mb-2">Solicitud enviada</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Tu registro está pendiente de aprobación. El administrador recibirá
          un aviso y te dará acceso en breve.
        </p>
        <p className="text-gray-600 text-xs mt-6">
          Cuando te aprueben, vuelve a hacer clic en el enlace mágico de tu email.
        </p>
      </div>
    </main>
  )
}
