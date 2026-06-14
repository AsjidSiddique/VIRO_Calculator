'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthGuard({ children }) {
  const router = useRouter()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('vc_token')
    if (!token) { router.replace('/login'); return }
    setOk(true)
  }, [router])

  if (!ok) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading ViroCalc...</p>
      </div>
    </div>
  )
  return children
}
