'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate } from '@/lib/format'
import { toast } from '@/components/Toast'

export default function StocksPage() {
  const [stocks,  setStocks]  = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState({ stock_name:'', date_added: new Date().toISOString().slice(0,10), notes:'' })

  useEffect(() => {
    api.get('/stocks').then(setStocks).finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!form.stock_name.trim()) return toast.error('Stock name required')
    setSaving(true)
    try {
      const s = await api.post('/stocks', form)
      setStocks(prev => [s, ...prev])
      setForm({ stock_name:'', date_added: new Date().toISOString().slice(0,10), notes:'' })
      setShowAdd(false)
      toast.success('Stock created!')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? All products and costs in this stock will be deleted.`)) return
    try {
      await api.delete(`/stocks/${id}`)
      setStocks(prev => prev.filter(s => s._id !== id))
      toast.success('Stock deleted')
    } catch (e) { toast.error(e.message) }
  }

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}
    </div>
  )

  return (
    <div className="space-y-5 slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stocks</h1>
          <p className="text-gray-400 text-sm">{stocks.length} purchase batches</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ New Stock</button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card border-2 border-primary/20 slide-up">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4">📦 New Stock</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Stock Name *</label>
              <input className="input" placeholder="e.g. Stock 1 — June 2026" value={form.stock_name}
                onChange={e => setForm(f => ({ ...f, stock_name: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label">Date Added</label>
              <input type="date" className="input" value={form.date_added}
                onChange={e => setForm(f => ({ ...f, date_added: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Notes (optional)</label>
              <input className="input" placeholder="Any notes..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleAdd} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : '✅ Create Stock'}
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Empty */}
      {stocks.length === 0 && !showAdd && (
        <div className="card text-center py-14">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300">No stocks yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first purchase batch to get started</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">+ Create First Stock</button>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {stocks.map(s => (
          <div key={s._id} className="card hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">📦</div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 dark:text-white group-hover:text-primary transition-colors truncate">{s.stock_name}</p>
                  <p className="text-xs text-gray-400">{fmtDate(s.date_added)}{s.notes ? ` · ${s.notes}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="hidden md:block text-right">
                  <p className="font-bold text-sm">{fmt(s.total_buy_amount)}</p>
                  <p className="text-xs text-gray-400">invested</p>
                </div>
                <div className="hidden md:block text-right">
                  <p className="font-bold text-sm text-red-500">{fmt(s.total_cost_amount)}</p>
                  <p className="text-xs text-gray-400">with costs</p>
                </div>
                <div className="hidden md:block text-right">
                  <p className="font-semibold text-sm text-primary">{((s.cost_multiplier||0)*100).toFixed(1)}%</p>
                  <p className="text-xs text-gray-400">cost ratio</p>
                </div>
                <Link href={`/stocks/${s._id}`} className="btn-primary text-xs py-2 px-3">Open →</Link>
                <button onClick={() => handleDelete(s._id, s.stock_name)} className="btn-danger text-xs py-2 px-3 hidden md:block">🗑️</button>
              </div>
            </div>
            {/* Mobile stats */}
            <div className="md:hidden grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-center">
              <div><p className="font-bold text-sm">{fmt(s.total_buy_amount)}</p><p className="text-xs text-gray-400">invested</p></div>
              <div><p className="font-bold text-sm text-red-500">{fmt(s.total_cost_amount)}</p><p className="text-xs text-gray-400">with costs</p></div>
              <div><p className="font-semibold text-sm text-primary">{((s.cost_multiplier||0)*100).toFixed(1)}%</p><p className="text-xs text-gray-400">cost ratio</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
