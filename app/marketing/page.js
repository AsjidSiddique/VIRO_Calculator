'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate, csvDownload } from '@/lib/format'
import { toast } from '@/components/Toast'

const PLATFORMS  = ['Facebook','TikTok','Google','Instagram','Other']
const P_ICON     = { Facebook:'📘', TikTok:'🎵', Google:'🔍', Instagram:'📸', Other:'📢' }
const STATUS_CFG = {
  planned:   { label:'📋 Planned',   cls:'bg-gray-100 text-gray-600' },
  running:   { label:'▶️ Running',   cls:'bg-blue-100 text-blue-700' },
  completed: { label:'✅ Completed', cls:'bg-green-100 text-green-700' },
}

function safeDiv(a, b) { return a > 0 && b > 0 ? a / b : null }

export default function Marketing() {
  const [campaigns, setCampaigns] = useState([])
  const [stocks,    setStocks]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [phase2Id,  setPhase2Id]  = useState(null) // open Phase 2 panel for a campaign

  const empty = () => ({
    platform:'Facebook', campaign_name:'', date:new Date().toISOString().slice(0,10),
    stock_id:'', estimated_budget:'', expected_orders:'', add_to_stock_cost:false,
    status:'planned',
    // phase 2
    actual_budget:'', actual_orders:'', actual_revenue:'', notes:'',
  })
  const [form, setForm] = useState(empty())

  useEffect(() => {
    Promise.all([api.get('/marketing'), api.get('/stocks')])
      .then(([m,s]) => { setCampaigns(m); setStocks(s) })
      .finally(() => setLoading(false))
  }, [])

  // Live preview values
  const estBudget  = parseFloat(form.estimated_budget) || 0
  const actBudget  = parseFloat(form.actual_budget)    || 0
  const actOrders  = parseFloat(form.actual_orders)    || 0
  const actRevenue = parseFloat(form.actual_revenue)   || 0
  const liveBudget = actBudget > 0 ? actBudget : estBudget
  const liveCPO    = safeDiv(liveBudget, actOrders)
  const liveROAS   = safeDiv(actRevenue, liveBudget)

  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  const handleSave = async () => {
    if (!form.estimated_budget && !form.actual_budget) return toast.error('Enter at least estimated budget')
    setSaving(true)
    try {
      if (editId) {
        const d = await api.put(`/marketing/${editId}`, form)
        setCampaigns(prev => prev.map(c => c._id === editId ? d : c))
        setEditId(null); toast.success('Campaign updated!')
      } else {
        const d = await api.post('/marketing', form)
        setCampaigns(prev => [d, ...prev])
        toast.success(form.add_to_stock_cost ? 'Campaign saved + added to stock costs!' : 'Campaign saved!')
      }
      setForm(empty()); setShowAdd(false)
    } catch(e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleEdit = c => {
    setForm({
      platform: c.platform, campaign_name: c.campaign_name||'',
      date: new Date(c.date).toISOString().slice(0,10), stock_id: c.stock_id||'',
      estimated_budget: c.estimated_budget||'', expected_orders: c.expected_orders||'',
      add_to_stock_cost: !!c.cost_id, status: c.status||'planned',
      actual_budget: c.actual_budget||'', actual_orders: c.actual_orders||'',
      actual_revenue: c.actual_revenue||'', notes: c.notes||'',
    })
    setEditId(c._id); setShowAdd(true)
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  // Quick Phase 2 update — just fill actual results
  const [p2Form, setP2Form] = useState({ actual_budget:'', actual_orders:'', actual_revenue:'' })
  const openPhase2 = c => {
    setP2Form({ actual_budget: c.actual_budget||'', actual_orders: c.actual_orders||'', actual_revenue: c.actual_revenue||'' })
    setPhase2Id(c._id)
  }
  const savePhase2 = async (c) => {
    try {
      const merged = {
        platform: c.platform, campaign_name: c.campaign_name||'', date: new Date(c.date).toISOString().slice(0,10),
        stock_id: c.stock_id||'', estimated_budget: c.estimated_budget||0, expected_orders: c.expected_orders||'',
        add_to_stock_cost: !!c.cost_id, status: 'completed',
        actual_budget:  parseFloat(p2Form.actual_budget)  || 0,
        actual_orders:  parseFloat(p2Form.actual_orders)  || 0,
        actual_revenue: parseFloat(p2Form.actual_revenue) || 0,
        notes: c.notes||'',
      }
      const d = await api.put(`/marketing/${c._id}`, merged)
      setCampaigns(prev => prev.map(x => x._id === c._id ? d : x))
      setPhase2Id(null)
      toast.success('Results saved! Stock cost updated with actual spend.')
    } catch(e) { toast.error(e.message) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this campaign? If it was added to stock costs, that cost will also be removed.')) return
    await api.delete(`/marketing/${id}`)
    setCampaigns(prev => prev.filter(c => c._id !== id))
    toast.success('Deleted and removed from stock costs')
  }

  const exportCSV = () => {
    if (!campaigns.length) return toast.error('Nothing to export')
    csvDownload(campaigns.map(c => ({
      Date: fmtDate(c.date), Platform: c.platform, Campaign: c.campaign_name||'',
      Status: c.status, 'Est. Budget': c.estimated_budget||'',
      'Actual Budget': c.actual_budget||'', 'Actual Orders': c.actual_orders||'',
      Revenue: c.actual_revenue||'', CPO: c.cost_per_order ? Math.round(c.cost_per_order) : '',
      ROAS: c.roas ? c.roas.toFixed(2) : '', 'In Stock Costs': c.cost_id ? 'Yes' : 'No',
    })), 'marketing-campaigns.csv')
    toast.success('Exported!')
  }

  const totalEstimated = campaigns.reduce((s,c) => s+(c.estimated_budget||0), 0)
  const totalActual    = campaigns.reduce((s,c) => s+(c.actual_budget||0), 0)
  const totalRevenue   = campaigns.reduce((s,c) => s+(c.actual_revenue||0), 0)
  const totalOrders    = campaigns.reduce((s,c) => s+(c.actual_orders||0), 0)
  const overallROAS    = safeDiv(totalRevenue, totalActual)

  if (loading) return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-24"/>)}</div>

  return (
    <div className="space-y-5 slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📢 Marketing Campaigns</h1>
          <p className="text-gray-400 text-sm">{campaigns.length} campaigns · {campaigns.filter(c=>c.cost_id).length} linked to stock costs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm">📥 CSV</button>
          <button onClick={() => { setShowAdd(v=>!v); setEditId(null); setForm(empty()) }} className="btn-primary">+ Add Campaign</button>
        </div>
      </div>

      {/* How it works explanation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm mb-2">💡 Two-Phase Marketing Cost System</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-700 dark:text-blue-400">
          <div className="bg-white dark:bg-blue-900/30 rounded-xl p-3">
            <p className="font-bold mb-1">📋 Phase 1 — Before Campaign (Estimate)</p>
            <p>Enter your planned budget → tick "Add to Stock Costs" → cost ratio updates so your product prices already include this marketing expense.</p>
          </div>
          <div className="bg-white dark:bg-blue-900/30 rounded-xl p-3">
            <p className="font-bold mb-1">✅ Phase 2 — After Campaign (Actual)</p>
            <p>Click "Enter Results" → add actual spend, orders, revenue → stock cost auto-updates to actual amount, ROAS and CPO calculated.</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card text-center"><p className="text-xs text-gray-400 mb-1">Est. Budget</p><p className="font-bold text-orange-500">{fmt(totalEstimated)}</p></div>
          <div className="card text-center"><p className="text-xs text-gray-400 mb-1">Actual Spend</p><p className="font-bold text-red-500">{fmt(totalActual)}</p></div>
          <div className="card text-center"><p className="text-xs text-gray-400 mb-1">Revenue</p><p className="font-bold text-green-600">{fmt(totalRevenue)}</p></div>
          <div className="card text-center"><p className="text-xs text-gray-400 mb-1">Orders</p><p className="font-bold text-primary">{totalOrders}</p></div>
          <div className="card text-center">
            <p className="text-xs text-gray-400 mb-1">Overall ROAS</p>
            {overallROAS
              ? <p className={`font-bold ${overallROAS>=2?'text-green-600':overallROAS>=1?'text-yellow-600':'text-red-500'}`}>{overallROAS.toFixed(2)}x</p>
              : <p className="font-bold text-gray-400">—</p>
            }
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAdd && (
        <div className="card border-2 border-primary/20 space-y-5 slide-up">
          <h3 className="font-bold text-gray-800 dark:text-white text-base">
            {editId ? '✏️ Edit Campaign' : '📢 New Campaign'}
          </h3>

          {/* ── Phase 1: Planning ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Planning — Before You Run</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="label">Platform</label>
                <select className="input" value={form.platform} onChange={e=>f('platform',e.target.value)}>
                  {PLATFORMS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Campaign Name</label>
                <input className="input" placeholder="Eid Sale, Handbags…" value={form.campaign_name}
                  onChange={e=>f('campaign_name',e.target.value)} />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={form.date} onChange={e=>f('date',e.target.value)} />
              </div>
              <div>
                <label className="label">Estimated Budget (PKR) *</label>
                <input type="number" className="input" placeholder="1500" value={form.estimated_budget}
                  onChange={e=>f('estimated_budget',e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Your planned ad spend</p>
              </div>
              <div>
                <label className="label">Expected Orders</label>
                <input type="number" className="input" placeholder="5" value={form.expected_orders}
                  onChange={e=>f('expected_orders',e.target.value)} />
              </div>
              <div>
                <label className="label">Linked Stock</label>
                <select className="input" value={form.stock_id} onChange={e=>f('stock_id',e.target.value)}>
                  <option value="">— None —</option>
                  {stocks.map(s=><option key={s._id} value={s._id}>{s.stock_name}</option>)}
                </select>
              </div>
            </div>

            {/* Add to stock cost toggle */}
            {form.stock_id && estBudget > 0 && (
              <div
                onClick={() => f('add_to_stock_cost', !form.add_to_stock_cost)}
                className={`mt-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.add_to_stock_cost ? 'border-primary bg-violet-50 dark:bg-violet-900/20' : 'border-gray-200 bg-gray-50 dark:bg-gray-700/30 hover:border-gray-300'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${form.add_to_stock_cost ? 'bg-primary' : 'border-2 border-gray-300'}`}>
                    {form.add_to_stock_cost && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-white">
                      Add {fmt(estBudget)} as cost on {stocks.find(s=>s._id===form.stock_id)?.stock_name || 'stock'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      This adds the estimated budget to your stock's cost ratio now, so product pricing already includes marketing expense.
                      When you enter actual spend later, the cost updates automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Phase 2: Results (optional at creation) ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Results — After Campaign (fill later if not done)</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="label">Actual Budget Spent</label>
                <input type="number" className="input" placeholder="Leave 0 if running" value={form.actual_budget}
                  onChange={e=>f('actual_budget',e.target.value)} />
                {actBudget > 0 && estBudget > 0 && actBudget !== estBudget && (
                  <p className={`text-xs mt-1 ${actBudget > estBudget ? 'text-red-500' : 'text-green-600'}`}>
                    {actBudget > estBudget ? `▲ Rs.${actBudget-estBudget} over estimate` : `▼ Rs.${estBudget-actBudget} under estimate`}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Actual Orders</label>
                <input type="number" className="input" placeholder="0" value={form.actual_orders}
                  onChange={e=>f('actual_orders',e.target.value)} />
              </div>
              <div>
                <label className="label">Actual Revenue</label>
                <input type="number" className="input" placeholder="0" value={form.actual_revenue}
                  onChange={e=>f('actual_revenue',e.target.value)} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e=>f('status',e.target.value)}>
                  <option value="planned">📋 Planned</option>
                  <option value="running">▶️ Running</option>
                  <option value="completed">✅ Completed</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Notes</label>
                <input className="input" placeholder="Any notes…" value={form.notes} onChange={e=>f('notes',e.target.value)} />
              </div>
            </div>

            {/* Live metrics */}
            {liveCPO !== null || liveROAS !== null ? (
              <div className="mt-3 flex flex-wrap gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm">
                {liveCPO  !== null && <span className="text-blue-700 dark:text-blue-300">Cost/order: <b>{fmt(Math.round(liveCPO))}</b></span>}
                {liveROAS !== null && (
                  <span className={`font-semibold ${liveROAS>=2?'text-green-600':liveROAS>=1?'text-yellow-600':'text-red-500'}`}>
                    ROAS: <b>{liveROAS.toFixed(2)}x</b> {liveROAS>=3?'🔥':liveROAS>=2?'✅':liveROAS>=1?'⚠️':'❌'}
                  </span>
                )}
                {liveROAS !== null && liveROAS < 1 && (
                  <span className="text-red-500 text-xs font-semibold">Spending more than earning — adjust budget!</span>
                )}
              </div>
            ) : estBudget > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-xs text-yellow-700 dark:text-yellow-400">
                ⏳ Fill actual results after the campaign to calculate ROAS and CPO
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editId ? '✅ Update' : '✅ Save Campaign'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditId(null); setForm(empty()) }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {campaigns.length === 0 && !showAdd && (
        <div className="card text-center py-14">
          <p className="text-4xl mb-3">📢</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300">No campaigns yet</p>
          <p className="text-gray-400 text-sm mt-1">Plan your budget first, then enter actual results after the campaign</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">+ Add First Campaign</button>
        </div>
      )}

      {/* Campaign Cards */}
      <div className="space-y-3">
        {campaigns.map(c => {
          const isPending   = !c.actual_orders || c.actual_orders === 0
          const statusCfg   = STATUS_CFG[c.status] || STATUS_CFG.planned
          const diff        = c.actual_budget && c.estimated_budget ? c.actual_budget - c.estimated_budget : null
          const isPhase2Open = phase2Id === c._id

          return (
            <div key={c._id} className="card hover:shadow-md transition-all">
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                    {P_ICON[c.platform]||'📢'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800 dark:text-white">{c.campaign_name||c.platform}</p>
                      <span className="badge-purple text-xs">{c.platform}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.cls}`}>{statusCfg.label}</span>
                      {c.cost_id && <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-xs font-semibold">📊 In Stock Costs</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(c.date)}{c.stock_id ? ` · ${stocks.find(s=>s._id===c.stock_id)?.stock_name||''}` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {isPending && (
                    <button onClick={() => openPhase2(c)}
                      className="bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-200 transition-all">
                      ✅ Enter Results
                    </button>
                  )}
                  <button onClick={() => handleEdit(c)} className="bg-gray-100 dark:bg-gray-700 text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-all text-sm">✏️</button>
                  <button onClick={() => handleDelete(c._id)} className="bg-red-50 text-red-400 p-1.5 rounded-lg hover:bg-red-100 transition-all text-sm">🗑️</button>
                </div>
              </div>

              {/* Phase 2 quick entry panel */}
              {isPhase2Open && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3 slide-up">
                  <p className="font-semibold text-sm text-green-700 dark:text-green-400">✅ Enter Actual Results</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="label">Actual Budget Spent</label>
                      <input type="number" className="input text-sm" placeholder={c.estimated_budget||'0'}
                        value={p2Form.actual_budget} onChange={e=>setP2Form(f=>({...f,actual_budget:e.target.value}))} autoFocus />
                      {c.estimated_budget && (
                        <p className="text-xs text-gray-400 mt-1">Estimated was {fmt(c.estimated_budget)}</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Actual Orders</label>
                      <input type="number" className="input text-sm" placeholder="0"
                        value={p2Form.actual_orders} onChange={e=>setP2Form(f=>({...f,actual_orders:e.target.value}))} />
                    </div>
                    <div>
                      <label className="label">Actual Revenue</label>
                      <input type="number" className="input text-sm" placeholder="0"
                        value={p2Form.actual_revenue} onChange={e=>setP2Form(f=>({...f,actual_revenue:e.target.value}))} />
                    </div>
                  </div>
                  {/* Live ROAS preview */}
                  {(() => {
                    const ab = parseFloat(p2Form.actual_budget) || c.estimated_budget || 0
                    const ao = parseFloat(p2Form.actual_orders) || 0
                    const ar = parseFloat(p2Form.actual_revenue) || 0
                    const cpo2  = safeDiv(ab, ao)
                    const roas2 = safeDiv(ar, ab)
                    if (!cpo2 && !roas2) return null
                    return (
                      <div className="flex flex-wrap gap-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-sm">
                        {cpo2  && <span className="text-gray-700 dark:text-gray-300">Cost/order: <b>{fmt(Math.round(cpo2))}</b></span>}
                        {roas2 && <span className={`font-bold ${roas2>=2?'text-green-600':roas2>=1?'text-yellow-600':'text-red-500'}`}>ROAS: {roas2.toFixed(2)}x {roas2>=2?'✅':'⚠️'}</span>}
                        {c.cost_id && <span className="text-violet-600 text-xs">Stock cost will update to {fmt(parseFloat(p2Form.actual_budget)||c.estimated_budget)}</span>}
                      </div>
                    )
                  })()}
                  <div className="flex gap-2">
                    <button onClick={() => savePhase2(c)} className="btn-primary text-sm">✅ Save Results</button>
                    <button onClick={() => setPhase2Id(null)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-center text-sm">
                <div>
                  <p className="text-xs text-gray-400">Est. Budget</p>
                  <p className="font-bold text-orange-500">{c.estimated_budget ? fmt(c.estimated_budget) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Actual Spend</p>
                  <p className="font-bold text-red-500">
                    {c.actual_budget ? fmt(c.actual_budget) : <span className="text-gray-400">—</span>}
                  </p>
                  {diff !== null && (
                    <p className={`text-xs ${diff>0?'text-red-400':'text-green-500'}`}>
                      {diff>0?`+${fmt(diff)} over`:`${fmt(Math.abs(diff))} saved`}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Revenue</p>
                  <p className="font-bold text-green-600">{c.actual_revenue ? fmt(c.actual_revenue) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Orders</p>
                  <p className="font-bold">{isPending ? '⏳' : c.actual_orders}{c.expected_orders ? <span className="text-gray-400 text-xs">/{c.expected_orders}</span> : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">CPO</p>
                  <p className="font-bold">{c.cost_per_order ? fmt(Math.round(c.cost_per_order)) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">ROAS</p>
                  <p className={`font-bold ${!c.roas?'text-gray-400':c.roas>=2?'text-green-600':c.roas>=1?'text-yellow-600':'text-red-500'}`}>
                    {c.roas ? `${c.roas.toFixed(2)}x` : '—'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
