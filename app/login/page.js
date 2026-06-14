'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [form,    setForm]    = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid credentials')
      localStorage.setItem('vc_token', data.token)
      router.push('/dashboard')
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 relative">
            <Image src="/logo.png" alt="ViroCalc" width={96} height={96}
              className="rounded-2xl object-contain drop-shadow-xl" priority />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ViroCalc</h1>
          <p className="text-gray-500 text-sm mt-1">Business Manager · Viro.pk</p>
        </div>

        {/* Card */}
        <div className="card shadow-xl border-0">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Sign in to continue</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input className="input" placeholder="asjid" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2 flex items-center gap-2">
                ❌ {error}
              </p>
            )}
            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-1">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</>
                : '🔐 Sign In'
              }
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Image src="/logo.png" alt="" width={24} height={24}
            className="inline-block mr-1 rounded opacity-40 object-contain" />
          <span className="text-xs text-gray-400">ViroCalc © 2026 · Private Access Only</span>
        </div>
      </div>
    </div>
  )
}
