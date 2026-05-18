'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Team = { id: number; name: string; flag_emoji: string; group_name: string }

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

export default function ApuestasGruposPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [bets, setBets] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeGroup, setActiveGroup] = useState('A')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: teamsData } = await supabase
      .from('teams').select('id, name, flag_emoji, group_name').order('group_name')

    const { data: betsData } = await supabase
      .from('group_position_bets').select('group_name, position, team_id').eq('participant_id', user.id)

    if (teamsData) setTeams(teamsData)
    if (betsData) {
      const map: Record<string, number> = {}
      betsData.forEach(b => { map[`${b.group_name}-${b.position}`] = b.team_id })
      setBets(map)
    }
    setLoading(false)
  }

  async function saveBet(group: string, position: number, teamId: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const key = `${group}-${position}`
    setSaving(key)

    // Si el equipo ya está en otra posición del grupo, lo quitamos
    const conflict = Object.entries(bets).find(([k, v]) => k.startsWith(`${group}-`) && k !== key && v === teamId)
    if (conflict) {
      const oldPos = parseInt(conflict[0].split('-')[1])
      await supabase.from('group_position_bets').delete()
        .eq('participant_id', user.id).eq('group_name', group).eq('position', oldPos)
      setBets(prev => { const n = { ...prev }; delete n[conflict[0]]; return n })
    }

    await supabase.from('group_position_bets').upsert(
      { participant_id: user.id, group_name: group, position, team_id: teamId },
      { onConflict: 'participant_id,group_name,position' }
    )
    setBets(prev => ({ ...prev, [key]: teamId }))
    setSaving(null)
    setSaved(key)
    setTimeout(() => setSaved(null), 1200)
  }

  const groupTeams = teams.filter(t => t.group_name === activeGroup)
  const totalBets = Object.keys(bets).length
  const totalNeeded = GROUPS.length * 4
  const pct = Math.round((totalBets / totalNeeded) * 100)
  const completedGroups = GROUPS.filter(g => [1,2,3,4].every(pos => bets[`${g}-${pos}`]))

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cargando grupos...</p>
    </div>
  )

  const posLabels: Record<number, { label: string; color: string }> = {
    1: { label: '1º', color: '#C9A84C' },
    2: { label: '2º', color: '#5b8ff9' },
    3: { label: '3º', color: 'rgba(255,255,255,0.4)' },
    4: { label: '4º', color: 'rgba(255,255,255,0.2)' },
  }

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '40px' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase', background: 'rgba(201,168,76,0.12)', border: '0.5px solid rgba(201,168,76,0.3)', padding: '3px 8px', borderRadius: '20px' }}>
            Fase de grupos
          </span>
          <span style={{ fontSize: '9px', color: '#5b8ff9', letterSpacing: '2px', textTransform: 'uppercase', background: 'rgba(26,86,196,0.12)', border: '0.5px solid rgba(26,86,196,0.3)', padding: '3px 8px', borderRadius: '20px' }}>
            2 pts posición exacta · 1 pt top 2
          </span>
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '3px' }}>Posiciones de grupo</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
          {completedGroups.length} / {GROUPS.length} grupos completados
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #1A56C4 0%, #C9A84C 60%, #C8102E 100%)', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', minWidth: '50px', textAlign: 'right' }}>{totalBets} / {totalNeeded}</span>
        </div>
      </div>

      {/* Selector de grupos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
        {GROUPS.map(g => {
          const complete = [1,2,3,4].every(pos => bets[`${g}-${pos}`])
          const active = activeGroup === g
          return (
            <button key={g} onClick={() => setActiveGroup(g)} style={{
              width: '38px', height: '38px', borderRadius: '8px',
              fontSize: '12px', fontWeight: 500,
              background: active ? '#C9A84C' : complete ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
              color: active ? '#05080F' : complete ? '#C9A84C' : 'rgba(255,255,255,0.4)',
              border: active ? 'none' : complete ? '0.5px solid rgba(201,168,76,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
            }}>
              {g}
              {complete && !active && (
                <span style={{ position: 'absolute', top: '-3px', right: '-3px', width: '8px', height: '8px', background: '#C9A84C', borderRadius: '50%' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Panel grupo */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderTop: '2px solid #C9A84C', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '9px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase' }}>Grupo {activeGroup}</span>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Elige el orden de clasificación</p>
          </div>
          {[1,2,3,4].every(pos => bets[`${activeGroup}-${pos}`]) && (
            <span style={{ fontSize: '11px', color: '#C9A84C' }}>✓ Completo</span>
          )}
        </div>

        {[1, 2, 3, 4].map(position => {
          const key = `${activeGroup}-${position}`
          const selectedTeamId = bets[key]
          const selectedTeam = teams.find(t => t.id === selectedTeamId)
          const isSav = saving === key
          const isSaved = saved === key

          return (
            <div key={position} style={{ padding: '12px 20px', borderBottom: position < 4 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '28px', fontSize: '13px', fontWeight: 500, color: posLabels[position].color, textAlign: 'center', flexShrink: 0 }}>
                  {posLabels[position].label}
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {groupTeams.map(team => {
                    const isSelected = selectedTeamId === team.id
                    const usedInOther = Object.entries(bets).some(([k, v]) => k.startsWith(`${activeGroup}-`) && k !== key && v === team.id)
                    return (
                      <button key={team.id} onClick={() => saveBet(activeGroup, position, team.id)} disabled={isSav} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 10px', borderRadius: '7px',
                        background: isSelected ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                        border: isSelected ? '0.5px solid rgba(201,168,76,0.5)' : '0.5px solid rgba(255,255,255,0.06)',
                        color: isSelected ? '#C9A84C' : usedInOther ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.65)',
                        fontSize: '12px', cursor: isSav ? 'wait' : 'pointer',
                        transition: 'all 0.15s', opacity: usedInOther ? 0.45 : 1,
                      }}>
                        <span className="flag-emoji" style={{ fontSize: '14px', lineHeight: 1 }}>{team.flag_emoji}</span>
                        <span>{team.name}</span>
                      </button>
                    )
                  })}
                </div>
                <div style={{ width: '18px', textAlign: 'center', fontSize: '11px', flexShrink: 0 }}>
                  {isSav ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>...</span>
                    : isSaved ? <span style={{ color: '#C9A84C' }}>✓</span>
                    : selectedTeam ? <span style={{ color: 'rgba(201,168,76,0.5)' }}>✓</span>
                    : null}
                </div>
              </div>
              {selectedTeam && (
                <div style={{ marginTop: '6px', marginLeft: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="flag-emoji" style={{ fontSize: '13px' }}>{selectedTeam.flag_emoji}</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{selectedTeam.name}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px', marginTop: '16px' }}>
        Se guarda automáticamente al seleccionar · los equipos en gris ya tienen posición asignada
      </div>
    </div>
  )
}
