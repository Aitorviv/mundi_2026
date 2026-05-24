export default function RestringidoPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', textAlign: 'center', gap: '24px',
    }}>
      <div style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase' }}>
        Acceso denegado
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 500, color: '#ffffff', margin: 0 }}>
        Zona restringida
      </h1>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', maxWidth: '300px', lineHeight: 1.6 }}>
        No tienes permisos para acceder a esta sección. Solo el administrador puede entrar aquí.
      </p>

      {/* GIF Mbappé */}
      <div style={{ width: '280px', borderRadius: '12px', overflow: 'hidden', border: '0.5px solid rgba(200,16,46,0.3)' }}>
        <div
          className="tenor-gif-embed"
          data-postid="10852935699183666378"
          data-share-method="host"
          data-aspect-ratio="1"
          data-width="100%"
        />
      </div>

      <a href="/apuestas" style={{
        fontSize: '11px', color: '#C9A84C',
        background: 'rgba(201,168,76,0.1)',
        border: '0.5px solid rgba(201,168,76,0.3)',
        borderRadius: '8px', padding: '10px 20px',
        textDecoration: 'none', letterSpacing: '1px', textTransform: 'uppercase',
      }}>
        Volver a mis apuestas →
      </a>
    </div>
  )
}
