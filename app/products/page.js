'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate, fmtPct } from '@/lib/format'
import { toast } from '@/components/Toast'

const CATEGORIES = ['All','Jewellery','Bags','Cosmetics','Hair Accessories','Clothing','Shoes','Other']

function todayStr() { return new Date().toISOString().slice(0,10) }

/* ══ SHARED QUICK MODAL — with date + history ══════════════════════ */
function QuickModal({ product, onClose, onSave }) {
  const [qty,      setQty]      = useState('')
  const [type,     setType]     = useState('sold')
  const [date,     setDate]     = useState(todayStr())
  const [note,     setNote]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [movements,setMovements]= useState([])
  const [loadingM, setLoadingM] = useState(true)
  const [showHist, setShowHist] = useState(false)

  useEffect(() => {
    api.get(`/movements?product_id=${product._id}`)
      .then(setMovements).catch(()=>{}).finally(()=>setLoadingM(false))
  }, [product._id])

  const n         = parseInt(qty) || 0
  const sellPrice = product.discount_price || product.regular_price || 0
  const costPrice = product.cost_price || product.buy_price || 0
  const revenue   = sellPrice * n
  const profit    = (sellPrice - costPrice) * n
  const profitPct = costPrice > 0 ? ((sellPrice - costPrice) / costPrice) * 100 : 0
  const stockAfter= Math.max(0, (product.current_stock ?? 0) + (type==='sold' ? -n : n))

  const handle = async () => {
    if (!n || n <= 0) return toast.error('Enter a valid quantity')
    setSaving(true)
    try {
      const updated = await api.patch(`/products/${product._id}`, {
        qty_change: type === 'sold' ? -n : n,
        type, date, note,
      })
      onSave(updated)
      toast.success(type==='sold' ? `✅ ${n} marked sold` : `📦 ${n} added to stock`)
      onClose()
    } catch(e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl slide-up max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-gray-800 dark:text-white">Quick Stock Update</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-0.5">
          <b>{product.product_code}</b>{product.product_name ? ` · ${product.product_name}` : ''}
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Current stock: <b className="text-gray-700 dark:text-gray-200">{product.current_stock ?? 0}</b>
        </p>

        {/* Sold / Add */}
        <div className="flex gap-2 mb-3">
          {[['sold','📤 Sold'],['add','📥 Add']].map(([t,label]) => (
            <button key={t} onClick={()=>setType(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all
                ${type===t ? (t==='sold'?'bg-primary text-white shadow-md':'bg-green-600 text-white shadow-md')
                           : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Quantity */}
        <label className="label">Quantity *</label>
        <input type="number" min="1" className="input mb-3" placeholder="e.g. 3"
          value={qty} onChange={e=>setQty(e.target.value)} autoFocus
          onKeyDown={e=>e.key==='Enter'&&handle()} />

        {/* Date */}
        <label className="label">Date</label>
        <input type="date" className="input mb-3" value={date}
          onChange={e=>setDate(e.target.value)} />

        {/* Note */}
        <label className="label">Note (optional)</label>
        <input className="input mb-4" placeholder="e.g. WhatsApp order, walk-in…"
          value={note} onChange={e=>setNote(e.target.value)} />

        {/* Profit preview */}
        {type==='sold' && n>0 && sellPrice>0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4 text-sm space-y-1.5">
            <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">📊 Sale Preview</p>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Revenue ({n} × {fmt(sellPrice)})</span><b>{fmt(revenue)}</b>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Cost ({n} × {fmt(Math.round(costPrice))})</span>
              <b className="text-red-500">-{fmt(Math.round(costPrice*n))}</b>
            </div>
            <div className="flex justify-between border-t border-green-200 pt-1.5">
              <span className="font-bold">Profit</span>
              <b className={profit>=0?'text-green-700':'text-red-600'}>
                {fmt(Math.round(profit))} ({fmtPct(profitPct)})
              </b>
            </div>
            <p className="text-xs text-gray-400">Stock after: <b>{stockAfter}</b></p>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button onClick={handle} disabled={saving||!n}
            className="btn-primary flex-1 disabled:opacity-50">
            {saving?'Saving…':'Save'}
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>

        {/* History toggle */}
        <button onClick={()=>setShowHist(h=>!h)}
          className="w-full text-xs text-gray-400 hover:text-primary py-1.5 border-t border-gray-100 dark:border-gray-700 transition-colors">
          {showHist?'▲ Hide':'▼ Show'} movement history ({movements.length})
        </button>
        {showHist && (
          <div className="mt-2 space-y-1 max-h-52 overflow-y-auto">
            {loadingM && <p className="text-xs text-gray-400 text-center py-3">Loading…</p>}
            {!loadingM && movements.length===0 && (
              <p className="text-xs text-gray-400 text-center py-3">No movements yet</p>
            )}
            {movements.map(m => (
              <div key={m._id} className="flex items-start justify-between text-xs py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-1.5">
                  <span>{m.type==='sold'?'📤':m.type==='add'?'📥':'↩️'}</span>
                  <span className={`font-bold ${m.type==='sold'?'text-red-500':'text-green-600'}`}>
                    {m.type==='sold'?'-':'+'}{m.qty}
                  </span>
                  {m.note && <span className="text-gray-400 italic truncate max-w-[90px]">{m.note}</span>}
                </div>
                <div className="text-right text-gray-400 flex-shrink-0 ml-2">
                  <p className="font-medium text-gray-600 dark:text-gray-300">
                    {new Date(m.date).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'2-digit'})}
                  </p>
                  <p>{m.stock_before}→{m.stock_after}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══ MAIN PAGE ══════════════════════════════════════════════════════ */
export default function ProductsPage() {
  const [products,    setProducts]    = useState([])
  const [stocks,      setStocks]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [catFilter,   setCatFilter]   = useState('All')
  const [stockFilter, setStockFilter] = useState('')
  const [lowOnly,     setLowOnly]     = useState(false)
  const [quickP,      setQuickP]      = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([api.get('/products'), api.get('/stocks')])
      setProducts(p); setStocks(s)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.product_code?.toLowerCase().includes(search.toLowerCase()) ||
      p.product_name?.toLowerCase().includes(search.toLowerCase())
    const matchCat   = catFilter==='All' || p.category?.toLowerCase()===catFilter.toLowerCase()
    const matchStock = !stockFilter || p.stock_id?._id===stockFilter || p.stock_id===stockFilter
    const matchLow   = !lowOnly || (p.current_stock??0) < 5
    return matchSearch && matchCat && matchStock && matchLow
  })

  const categories = ['All', ...new Set(products.map(p=>p.category).filter(Boolean))]

  const handleDelete = async (id, code) => {
    if (!confirm(`Delete product ${code}?`)) return
    await api.delete(`/products/${id}`)
    setProducts(prev => prev.filter(p => p._id !== id))
    toast.success('Deleted')
  }

  if (loading) return (
    <div className="space-y-4">{[1,2,3,4].map(i=><div key={i} className="skeleton h-24"/>)}</div>
  )

  return (
    <div className="space-y-5 slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🏷️ All Products</h1>
          <p className="text-gray-400 text-sm">{filtered.length} of {products.length} products shown</p>
        </div>
        <button onClick={()=>setLowOnly(v=>!v)}
          className={`btn text-sm ${lowOnly?'bg-red-500 text-white':'btn-secondary'}`}>
          ⚠️ Low Stock{lowOnly?' (on)':''}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <input className="input flex-1 min-w-48" placeholder="🔍 Search by code or name…"
            value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="input w-auto" value={stockFilter} onChange={e=>setStockFilter(e.target.value)}>
            <option value="">All Stocks</option>
            {stocks.map(s=><option key={s._id} value={s._id}>{s.stock_name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(c=>(
            <button key={c} onClick={()=>setCatFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                ${catFilter===c?'bg-primary text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Total Products</p>
          <p className="font-bold text-gray-900 dark:text-white">{filtered.length}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Stock Value (cost)</p>
          <p className="font-bold text-primary">{fmt(filtered.reduce((s,p)=>s+(p.cost_price||p.buy_price||0)*(p.current_stock||0),0))}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Low Stock (&lt;5)</p>
          <p className="font-bold text-yellow-500">{filtered.filter(p=>(p.current_stock??0)>0&&(p.current_stock??0)<5).length}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Out of Stock</p>
          <p className="font-bold text-red-600">{filtered.filter(p=>(p.current_stock??0)===0).length}</p>
        </div>
      </div>

      {/* Product list */}
      {filtered.length===0 ? (
        <div className="card text-center py-14">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300">No products found</p>
          <Link href="/stocks" className="btn-primary mt-4 inline-block">Go to Stocks →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p._id} className="card hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge-purple">{p.product_code}</span>
                    {p.category && <span className="badge-yellow">{p.category}</span>}
                    {(p.current_stock??0)===0 && (
                      <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">OUT</span>
                    )}
                    {(p.current_stock??0)>0 && (p.current_stock??0)<5 && (
                      <span className="badge-red">⚠️ Low: {p.current_stock}</span>
                    )}
                  </div>
                  {p.product_name && (
                    <p className="font-semibold text-gray-800 dark:text-white mt-1 text-sm">{p.product_name}</p>
                  )}
                  {p.stock_id && (
                    <Link href={`/stocks/${p.stock_id._id||p.stock_id}`}
                      className="text-xs text-primary hover:underline mt-0.5 inline-block">
                      📦 {p.stock_id.stock_name||'View Stock'} · {fmtDate(p.stock_id.date_added)}
                    </Link>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={()=>setQuickP(p)}
                    className="bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-green-200 transition-all">
                    📦 {p.current_stock??0}
                  </button>
                  <Link href={`/stocks/${p.stock_id?._id||p.stock_id}`}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-600 px-2 py-1.5 rounded-lg text-xs hover:bg-gray-200 transition-all">✏️</Link>
                  <button onClick={()=>handleDelete(p._id,p.product_code)}
                    className="bg-red-50 text-red-500 p-1.5 rounded-lg hover:bg-red-100 text-sm">🗑️</button>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Buy</p>
                  <p className="font-semibold">{fmt(p.buy_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Cost to Me</p>
                  <p className="font-semibold text-red-500">{fmt(Math.round(p.cost_price||0))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Regular</p>
                  <p className="font-semibold">{fmt(p.regular_price)}</p>
                  <p className="text-xs text-green-600">+{fmtPct(p.profit_on_regular)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Discount</p>
                  <p className="font-semibold">{fmt(p.discount_price)}</p>
                  <p className={`text-xs ${(p.profit_on_discount||0)>=0?'text-green-600':'text-red-500'}`}>
                    {fmtPct(p.profit_on_discount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Qty Bought</p>
                  <p className="font-semibold">{p.quantity_bought}</p>
                  {(p.quantity_sold||0)>0 && (
                    <p className="text-xs text-orange-500">-{p.quantity_sold} sold</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">In Stock</p>
                  <p className={`font-bold ${(p.current_stock??0)===0?'text-red-600':(p.current_stock??0)<5?'text-yellow-600':'text-green-600'}`}>
                    {p.current_stock??0} / {p.quantity_bought}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {quickP && (
        <QuickModal product={quickP} onClose={()=>setQuickP(null)}
          onSave={updated=>{
            setProducts(prev=>prev.map(p=>p._id===updated._id?updated:p))
            setQuickP(null)
          }} />
      )}
    </div>
  )
}
