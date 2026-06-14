'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate, fmtPct } from '@/lib/format'
import { toast } from '@/components/Toast'

const CATEGORIES = ['All','Jewellery','Bags','Cosmetics','Hair Accessories','Clothing','Shoes','Other']

function QuickModal({ product, onClose, onSave }) {
  const [qty, setQty]   = useState('')
  const [type, setType] = useState('sold')
  const handle = async () => {
    const n = parseInt(qty)
    if (!n || n <= 0) return toast.error('Enter a valid quantity')
    try {
      const updated = await api.patch(`/products/${product._id}`, { qty_change: type === 'sold' ? -n : n })
      onSave(updated)
      toast.success(type === 'sold' ? `✅ Marked ${n} sold` : `📦 Added ${n} stock`)
      onClose()
    } catch(e) { toast.error(e.message) }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-xs shadow-2xl slide-up">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">Quick Stock Update</h3>
        <p className="text-sm text-gray-500 mb-1">{product.product_code}{product.product_name ? ` · ${product.product_name}` : ''}</p>
        <p className="text-xs text-gray-400 mb-3">Current stock: <b className="text-gray-700 dark:text-gray-200">{product.current_stock ?? 0}</b></p>
        <div className="flex gap-2 mb-3">
          {['sold','add'].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${type===t?(t==='sold'?'bg-primary text-white':'bg-green-600 text-white'):'bg-gray-100 text-gray-600'}`}>
              {t === 'sold' ? '📤 Sold' : '📥 Add'}
            </button>
          ))}
        </div>
        <input type="number" className="input mb-4" placeholder="Quantity" value={qty}
          onChange={e => setQty(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handle()} />
        <div className="flex gap-2">
          <button onClick={handle} className="btn-primary flex-1">Save</button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  )
}

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
    const matchCat   = catFilter === 'All' || p.category?.toLowerCase() === catFilter.toLowerCase()
    const matchStock = !stockFilter || p.stock_id?._id === stockFilter || p.stock_id === stockFilter
    const matchLow   = !lowOnly || (p.current_stock ?? 0) < 5
    return matchSearch && matchCat && matchStock && matchLow
  })

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))]

  const handleDelete = async (id, code) => {
    if (!confirm(`Delete product ${code}?`)) return
    await api.delete(`/products/${id}`)
    setProducts(prev => prev.filter(p => p._id !== id))
    toast.success('Deleted')
  }

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}
    </div>
  )

  return (
    <div className="space-y-5 slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🏷️ All Products</h1>
          <p className="text-gray-400 text-sm">{filtered.length} of {products.length} products shown</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLowOnly(v => !v)}
            className={`btn text-sm ${lowOnly ? 'bg-red-500 text-white' : 'btn-secondary'}`}>
            ⚠️ Low Stock{lowOnly ? ' (on)' : ''}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <input className="input flex-1 min-w-48" placeholder="🔍 Search by code or name…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-auto" value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
            <option value="">All Stocks</option>
            {stocks.map(s => <option key={s._id} value={s._id}>{s.stock_name}</option>)}
          </select>
        </div>
        {/* Category pills */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${catFilter === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center py-3"><p className="text-xs text-gray-400 mb-1">Total Products</p><p className="font-bold text-gray-900 dark:text-white">{filtered.length}</p></div>
        <div className="card text-center py-3"><p className="text-xs text-gray-400 mb-1">Total Stock Value</p><p className="font-bold text-primary">{fmt(filtered.reduce((s,p) => s + (p.buy_price||0)*(p.current_stock||0), 0))}</p></div>
        <div className="card text-center py-3"><p className="text-xs text-gray-400 mb-1">Low Stock (&lt;5)</p><p className="font-bold text-red-500">{filtered.filter(p => (p.current_stock??0) < 5).length}</p></div>
        <div className="card text-center py-3"><p className="text-xs text-gray-400 mb-1">Out of Stock</p><p className="font-bold text-red-600">{filtered.filter(p => (p.current_stock??0) === 0).length}</p></div>
      </div>

      {/* Products */}
      {filtered.length === 0 ? (
        <div className="card text-center py-14">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300">No products found</p>
          <p className="text-gray-400 text-sm mt-1">Add products inside a stock to see them here</p>
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
                    {(p.current_stock ?? 0) < 5 && <span className="badge-red">⚠️ Low: {p.current_stock ?? 0}</span>}
                    {(p.current_stock ?? 0) === 0 && <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">OUT</span>}
                  </div>
                  {p.product_name && <p className="font-semibold text-gray-800 dark:text-white mt-1 text-sm">{p.product_name}</p>}
                  {p.stock_id && (
                    <Link href={`/stocks/${p.stock_id._id || p.stock_id}`}
                      className="text-xs text-primary hover:underline mt-0.5 inline-block">
                      📦 {p.stock_id.stock_name || 'View Stock'} · {fmtDate(p.stock_id.date_added)}
                    </Link>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => setQuickP(p)}
                    className="bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-200 transition-all">
                    📦 {p.current_stock ?? 0}
                  </button>
                  <Link href={`/stocks/${p.stock_id?._id || p.stock_id}`}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1.5 rounded-lg text-xs hover:bg-gray-200 transition-all">✏️</Link>
                  <button onClick={() => handleDelete(p._id, p.product_code)}
                    className="bg-red-50 text-red-500 p-1.5 rounded-lg hover:bg-red-100 transition-all text-sm">🗑️</button>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-sm">
                <div><p className="text-xs text-gray-400">Buy</p><p className="font-semibold">{fmt(p.buy_price)}</p></div>
                <div><p className="text-xs text-gray-400">Cost to Me</p><p className="font-semibold text-red-500">{fmt(p.cost_price)}</p></div>
                <div>
                  <p className="text-xs text-gray-400">Regular</p>
                  <p className="font-semibold">{fmt(p.regular_price)}</p>
                  <p className="text-xs text-green-600">+{fmtPct(p.profit_on_regular)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Discount</p>
                  <p className="font-semibold">{fmt(p.discount_price)}</p>
                  <p className={`text-xs ${(p.profit_on_discount||0)>=0?'text-green-600':'text-red-500'}`}>{fmtPct(p.profit_on_discount)}</p>
                </div>
                {p.effective_cost_price && p.effective_cost_price !== p.cost_price && (
                  <div>
                    <p className="text-xs text-gray-400">Effective Cost</p>
                    <p className="font-semibold text-orange-500">{fmt(p.effective_cost_price)}</p>
                    <p className="text-xs text-gray-400">incl. mkt+cod</p>
                  </div>
                )}
                <div><p className="text-xs text-gray-400">In Stock</p>
                  <p className={`font-bold ${(p.current_stock??0)<5?'text-red-500':'text-green-600'}`}>{p.current_stock ?? 0} / {p.quantity_bought}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {quickP && (
        <QuickModal product={quickP} onClose={() => setQuickP(null)}
          onSave={updated => { setProducts(prev => prev.map(p => p._id === updated._id ? updated : p)); setQuickP(null) }} />
      )}
    </div>
  )
}
