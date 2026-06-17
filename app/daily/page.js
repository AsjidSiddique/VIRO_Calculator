'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate, csvDownload } from '@/lib/format'
import { toast } from '@/components/Toast'

export default function DailyRecords() {
  const [records,  setRecords]  = useState([])
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [expanded, setExpanded] = useState(null)

  const emptyForm = () => ({
    date: new Date().toISOString().slice(0,10),
    sales: [], cod_returns: [], other_expenses: [], notes: '',
  })
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    Promise.all([api.get('/daily'), api.get('/products')])
      .then(([d,p]) => { setRecords(d); setProducts(p) })
      .finally(() => setLoading(false))
  }, [])

  /* ── Sales helpers ── */
  const addSale = () => setForm(f=>({...f, sales:[...f.sales,{product_id:'',product_code:'',product_name:'',qty_sold:1,sell_price:'',cost_price:0,revenue:0,profit:0}]}))

  const updateSale = (i, field, val) => setForm(f => {
    const s = [...f.sales]
    s[i] = { ...s[i], [field]: val }
    if (field === 'product_id') {
      const p = products.find(x => x._id === val)
      if (p) { s[i].product_code=p.product_code; s[i].product_name=p.product_name||''; s[i].cost_price=p.cost_price||0; if(!s[i].sell_price) s[i].sell_price=p.discount_price||p.regular_price||0 }
    }
    const qty=parseFloat(s[i].qty_sold)||0, sp=parseFloat(s[i].sell_price)||0, cp=parseFloat(s[i].cost_price)||0
    s[i].revenue=qty*sp; s[i].profit=qty*(sp-cp)
    return {...f,sales:s}
  })

  const removeSale = i => setForm(f=>({...f,sales:f.sales.filter((_,j)=>j!==i)}))

  /* ── Returns helpers ── */
  const addReturn = () => setForm(f=>({...f,cod_returns:[...f.cod_returns,{product_id:'',product_code:'',qty:1,loss_amount:'',reason:''}]}))

  const updateReturn = (i, field, val) => setForm(f => {
    const r=[...f.cod_returns]; r[i]={...r[i],[field]:val}
    if(field==='product_id'){ const p=products.find(x=>x._id===val); if(p){r[i].product_code=p.product_code;r[i].loss_amount=r[i].loss_amount||p.buy_price||0} }
    return {...f,cod_returns:r}
  })

  /* ── Expense helpers ── */
  const addExp = () => setForm(f=>({...f,other_expenses:[...f.other_expenses,{label:'',amount:''}]}))
  const updateExp = (i,field,val) => setForm(f=>{ const e=[...f.other_expenses]; e[i]={...e[i],[field]:val}; return {...f,other_expenses:e} })

  /* Totals */
  const tRev  = form.sales.reduce((s,i)=>s+(i.revenue||0),0)
  const tProf = form.sales.reduce((s,i)=>s+(i.profit||0),0)
  const tRet  = form.cod_returns.reduce((s,r)=>s+(parseFloat(r.loss_amount)||0),0)
  const tExp  = form.other_expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0)
  const tNet  = tProf - tRet - tExp

  const handleSave = async () => {
    if (!form.date) return toast.error('Date required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        cod_returns:    form.cod_returns.map(r=>({...r,loss_amount:parseFloat(r.loss_amount)||0})),
        other_expenses: form.other_expenses.map(e=>({...e,amount:parseFloat(e.amount)||0})),
      }
      const rec = await api.post('/daily', payload)
      setRecords(prev=>[rec,...prev])
      setForm(emptyForm()); setShowAdd(false)
      toast.success('Daily record saved!')
    } catch(e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if(!confirm('Delete this daily record?')) return
    await api.delete(`/daily/${id}`)
    setRecords(prev=>prev.filter(r=>r._id!==id))
    toast.success('Deleted')
  }

  const exportCSV = () => {
    if(!records.length) return toast.error('No records to export')
    csvDownload(records.map(r=>({
      Date:fmtDate(r.date), Revenue:r.total_revenue, 'Gross Profit':r.total_profit,
      'Returns Loss':r.total_returns_loss, 'Other Expenses':r.total_other_expenses, 'Net Profit':r.net_profit,
    })), 'daily-records.csv')
    toast.success('CSV exported!')
  }

  if (loading) return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-20"/>)}</div>

  return (
    <div className="space-y-5 slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📅 Daily Records</h1>
          <p className="text-gray-400 text-sm">{records.length} records saved</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm">📥 Export CSV</button>
          <button onClick={() => setShowAdd(v=>!v)} className="btn-primary">+ Add Record</button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card border-2 border-primary/20 space-y-4 slide-up">
          <h3 className="font-bold text-gray-800 dark:text-white">📅 New Daily Record</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" placeholder="e.g. Eid day" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
            </div>
          </div>

          {/* Sales */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">📤 Sales ({form.sales.length})</p>
              <button onClick={addSale} className="text-primary text-sm font-semibold hover:underline">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {form.sales.map((s,i)=>(
                <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="col-span-2 md:col-span-2">
                    <select className="input text-sm" value={s.product_id} onChange={e=>updateSale(i,'product_id',e.target.value)}>
                      <option value="">Select product…</option>
                      {products.map(p=><option key={p._id} value={p._id}>{p.product_code}{p.product_name?` · ${p.product_name}`:''}</option>)}
                    </select>
                  </div>
                  <input type="number" className="input text-sm" placeholder="Qty" value={s.qty_sold} onChange={e=>updateSale(i,'qty_sold',e.target.value)} />
                  <input type="number" className="input text-sm" placeholder="Sell price" value={s.sell_price} onChange={e=>updateSale(i,'sell_price',e.target.value)} />
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold flex-1 ${s.profit>=0?'text-green-600':'text-red-500'}`}>{fmt(Math.round(s.profit))}</span>
                    <button onClick={()=>removeSale(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COD Returns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm text-red-500">↩️ COD Returns ({form.cod_returns.length})</p>
              <button onClick={addReturn} className="text-red-500 text-sm font-semibold hover:underline">+ Add Return</button>
            </div>
            <div className="space-y-2">
              {form.cod_returns.map((r,i)=>(
                <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <select className="input text-sm" value={r.product_id} onChange={e=>updateReturn(i,'product_id',e.target.value)}>
                    <option value="">Product…</option>
                    {products.map(p=><option key={p._id} value={p._id}>{p.product_code}</option>)}
                  </select>
                  <input type="number" className="input text-sm" placeholder="Loss amount" value={r.loss_amount} onChange={e=>updateReturn(i,'loss_amount',e.target.value)} />
                  <input className="input text-sm" placeholder="Reason" value={r.reason} onChange={e=>updateReturn(i,'reason',e.target.value)} />
                  <button onClick={()=>setForm(f=>({...f,cod_returns:f.cod_returns.filter((_,j)=>j!==i)}))} className="text-red-400 text-sm font-semibold">✕ Remove</button>
                </div>
              ))}
            </div>
          </div>

          {/* Other expenses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm text-yellow-600">🔧 Other Expenses ({form.other_expenses.length})</p>
              <button onClick={addExp} className="text-yellow-600 text-sm font-semibold hover:underline">+ Add Expense</button>
            </div>
            <div className="space-y-2">
              {form.other_expenses.map((e,i)=>(
                <div key={i} className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                  <input className="input text-sm" placeholder="Label e.g. Fuel" value={e.label} onChange={ev=>updateExp(i,'label',ev.target.value)} />
                  <input type="number" className="input text-sm" placeholder="Amount" value={e.amount} onChange={ev=>updateExp(i,'amount',ev.target.value)} />
                  <button onClick={()=>setForm(f=>({...f,other_expenses:f.other_expenses.filter((_,j)=>j!==i)}))} className="text-yellow-600 text-sm font-semibold">✕ Remove</button>
                </div>
              ))}
            </div>
          </div>

          {/* Running total */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
            <div><p className="text-xs text-gray-400">Revenue</p><p className="font-bold text-primary">{fmt(Math.round(tRev))}</p></div>
            <div><p className="text-xs text-gray-400">Gross Profit</p><p className="font-bold text-green-600">{fmt(Math.round(tProf))}</p></div>
            <div><p className="text-xs text-gray-400">Returns Loss</p><p className="font-bold text-red-500">-{fmt(Math.round(tRet))}</p></div>
            <div><p className="text-xs text-gray-400">Other Exp.</p><p className="font-bold text-yellow-600">-{fmt(Math.round(tExp))}</p></div>
            <div><p className="text-xs text-gray-400">Net Profit</p><p className={`font-bold text-lg ${tNet>=0?'text-green-600':'text-red-500'}`}>{fmt(Math.round(tNet))}</p></div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving?'Saving…':'✅ Save Record'}</button>
            <button onClick={()=>setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Records list */}
      {records.length === 0 && !showAdd ? (
        <div className="card text-center py-14">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300">No daily records yet</p>
          <button onClick={()=>setShowAdd(true)} className="btn-primary mt-4">+ Add First Record</button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r=>(
            <div key={r._id} className="card hover:shadow-md transition-all">
              <div className="flex items-center justify-between cursor-pointer" onClick={()=>setExpanded(expanded===r._id?null:r._id)}>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-lg">📅</span>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white">{fmtDate(r.date)}</p>
                    {r.notes && <p className="text-xs text-gray-400">{r.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden md:block text-right"><p className="text-xs text-gray-400">Revenue</p><p className="font-semibold text-sm">{fmt(r.total_revenue)}</p></div>
                  <div className="text-right"><p className="text-xs text-gray-400">Net Profit</p><p className={`font-bold ${r.net_profit>=0?'text-green-600':'text-red-500'}`}>{fmt(r.net_profit)}</p></div>
                  <div className="flex gap-1 items-center">
                    <button onClick={e=>{e.stopPropagation();handleDelete(r._id)}} className="text-red-400 hover:text-red-600 p-1 text-sm">🗑️</button>
                    <span className="text-gray-400 text-xs">{expanded===r._id?'▲':'▼'}</span>
                  </div>
                </div>
              </div>

              {expanded===r._id && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[{l:'Revenue',v:r.total_revenue,c:'text-primary'},{l:'Gross Profit',v:r.total_profit,c:'text-green-600'},
                      {l:'Returns',v:r.total_returns_loss,c:'text-red-500'},{l:'Expenses',v:r.total_other_expenses,c:'text-yellow-600'},
                      {l:'Net Profit',v:r.net_profit,c:r.net_profit>=0?'text-green-600':'text-red-500'}
                    ].map(x=>(
                      <div key={x.l} className="card text-center py-2">
                        <p className="text-xs text-gray-400">{x.l}</p>
                        <p className={`font-bold ${x.c}`}>{fmt(x.v)}</p>
                      </div>
                    ))}
                  </div>
                  {r.sales?.length>0 && (
                    <div>
                      <p className="font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase mb-1">Sales ({r.sales.length})</p>
                      {r.sales.map((s,i)=>(
                        <div key={i} className="flex justify-between py-1 text-xs text-gray-600 dark:text-gray-400 border-b border-gray-50 dark:border-gray-700">
                          <span>{s.product_code}{s.product_name?` · ${s.product_name}`:''} × {s.qty_sold}</span>
                          <span className="font-semibold">{fmt(s.revenue)} <span className="text-green-600">({fmt(Math.round(s.profit))} profit)</span></span>
                        </div>
                      ))}
                    </div>
                  )}
                  {r.cod_returns?.length>0 && (
                    <div>
                      <p className="font-semibold text-red-500 text-xs uppercase mb-1">Returns ({r.cod_returns.length})</p>
                      {r.cod_returns.map((ret,i)=>(
                        <div key={i} className="flex justify-between py-1 text-xs text-gray-500 border-b border-gray-50 dark:border-gray-700">
                          <span>{ret.product_code} — {ret.reason||'No reason'}</span>
                          <span className="text-red-500 font-semibold">-{fmt(ret.loss_amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {r.other_expenses?.length>0 && (
                    <div>
                      <p className="font-semibold text-yellow-600 text-xs uppercase mb-1">Expenses ({r.other_expenses.length})</p>
                      {r.other_expenses.map((e,i)=>(
                        <div key={i} className="flex justify-between py-1 text-xs text-gray-500">
                          <span>{e.label}</span><span className="font-semibold">-{fmt(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
