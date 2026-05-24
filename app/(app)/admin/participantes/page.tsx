'use client'

import { useEffect, useState } from 'react'

type Participant = {
  id: string
  username: string
  display_name: string | null
  name: string
  is_admin: boolean
  total_points: number
}

export default function AdminParticipantesPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [newUsername, setNewUsername] = useState('')
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { loadParticipants() }, [])

  async function loadParticipants() {
    const res = await fetch('/api/admin/participants')
    const data = await res.json()
    if (data.participants) setParticipants(data.participants)
    setLoading(false)
  }

  function generatePin() {
    setNewPin(Math.floor(100000 + Math.random() * 900000).toString())
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newUsername || !newName || newPin.length !== 6) return
    setCreating(true)
    setMessage('')

    const res = await fetch('/api/admin/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: newUsername.trim().toLowerCase(),
        name: newName.trim(),
        pin: newPin,
      }),
    })

    const data = await res.json()
    if (res.ok) {
      setMessage(`✓ Usuario "${newUsername}" creado · PIN: ${newPin} (anótalo, no se puede recuperar)`)
      setNewUsername(''); setNewName(''); setNewPin('')
      loadParticipants()
    } else {
      setMessage(`✗ Error: ${data.error}`)
    }
    setCreating(false)
  }

  async function deleteUser(id: string, username: string) {
    if (!confirm(`¿Eliminar usuario "${username}"?`)) return
    await fetch(`/api/admin/participants?id=${id}`, { method: 'DELETE' })
    loadParticipants()
  }

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '9px', color: '#C8102E', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>Panel administrador</div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff' }}>Participantes</h1>
      </div>

      {/* Crear usuario */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
        <div style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>Crear nuevo usuario</div>

        <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Usuario</label>
              <input type="text" value={newUsername}
                onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="mikel"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Nombre visible</label>
              <input type="text" value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Mikel Goikoetxea"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '9px 12px', color: '#ffffff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>PIN (6 dígitos)</label>
              <input type="text" value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" maxLength={6} inputMode="numeric"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '9px 12px', color: '#C9A84C', fontSize: '18px', letterSpacing: '6px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button type="button" onClick={generatePin} style={{
              padding: '9px 14px', background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '7px',
              color: 'rgba(255,255,255,0.5)', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>🎲 Generar</button>
          </div>

          {message && (
            <p style={{ fontSize: '12px', color: message.startsWith('✓') ? '#C9A84C' : '#ff4d6a', padding: '8px 12px', background: message.startsWith('✓') ? 'rgba(201,168,76,0.1)' : 'rgba(200,16,46,0.1)', borderRadius: '6px' }}>
              {message}
            </p>
          )}

          <button type="submit" disabled={creating || !newUsername || !newName || newPin.length !== 6} style={{
            background: 'linear-gradient(90deg, #C9A84C, #b8962a)', border: 'none', borderRadius: '8px',
            padding: '11px', color: '#05080F', fontSize: '12px', fontWeight: 600,
            letterSpacing: '0.5px', cursor: creating ? 'wait' : 'pointer',
            opacity: !newUsername || !newName || newPin.length !== 6 ? 0.4 : 1,
          }}>
            {creating ? 'Creando...' : '+ Crear usuario'}
          </button>
        </form>
      </div>

      {/* Lista */}
      <div style={{ fontSize: '9px', color: '#5b8ff9', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        Participantes ({participants.length})
        <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(26,86,196,0.3), transparent)' }} />
      </div>

      {loading ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Cargando...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {participants.map(p => (
            <div key={p.id} style={{
              background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)',
              borderRadius: '10px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: 500 }}>{p.display_name || p.name}</span>
                  {p.is_admin && <span style={{ fontSize: '9px', color: '#C8102E', background: 'rgba(200,16,46,0.1)', border: '0.5px solid rgba(200,16,46,0.3)', padding: '1px 5px', borderRadius: '4px' }}>ADMIN</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>@{p.username} · {p.total_points} pts</div>
              </div>
              {!p.is_admin && (
                <button onClick={() => deleteUser(p.id, p.username)} style={{
                  fontSize: '11px', color: 'rgba(200,16,46,0.5)', background: 'none',
                  border: '0.5px solid rgba(200,16,46,0.2)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
                }}>Eliminar</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
