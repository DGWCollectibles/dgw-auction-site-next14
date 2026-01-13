'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function DeleteLotButton({ lotId }: { lotId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lot? This cannot be undone.')) {
      return
    }

    setLoading(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('lots')
      .delete()
      .eq('id', lotId)

    if (error) {
      alert('Error deleting lot: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/admin/lots')
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="w-full btn bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50"
    >
      {loading ? 'Deleting...' : 'Delete Lot'}
    </button>
  )
}
