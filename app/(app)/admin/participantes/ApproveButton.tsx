'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ApproveButton({ participantId }: { participantId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function approve() {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('participants')
      .update({ approved: true })
      .eq('id', participantId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={approve}
      disabled={loading}
      className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      {loading ? 'Aprobando...' : 'Aprobar'}
    </button>
  )
}
