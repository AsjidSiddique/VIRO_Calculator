'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate, fmtPct } from '@/lib/format'

export default function Search() {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = async (q = query) => {
    if (!q.trim()) return
    setLoading(true); setSearched(true)
    try {
      const data = await api.get(`/products?search=${encodeURIComponent(q)}`)
      setResults(data)
    } catch { setResults([]) }
    finally { setLoading(false) }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') { doSearch(); return }
    clearTimeout(window._st)
    if (e.target.value.length >= 2) window._st = setTimeout(() => doSearch(e.target.value), 400)
  }

  return (
    <div className="space-y-5 slide-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🔍 Search Products</h1>
        <p className="text-gray-400 text-sm">Search by code or name across all stocks</p>
      </div>

      <div className="card p-4">
        <div className="flex gap-3">
          <input className="input flex-1 text-base" placeholder="Enter product code (e.g. LIP01) or name…"
            value={query} onChange={e=>setQuery(e.target.value)} onKeyUp={handleKey} autoFocus />
          <button onClick={()=>doSearch()} className="btn-primary px-5">Search</button>
        </div>
      </div>

      {loading && <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-24"/>)}</div>}

      {!loading && searched && results.length===0 && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300">No products found for "{query}"</p>
        </div>
      )}

      {!loading && results.length>0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{results.length} result{results.length>1?'s':''} for "{query}"</p>
          {results.map(p=>(
            <div key={p._id} className="card hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                    <span className="text-primary font-bold text-xs">{p.product_code.slice(0,3)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge-purple">{p.product_code}</span>
                      {p.category && <span className="badge-yellow">{p.category}</span>}
                      {(p.current_stock??0)<5 && <span className="badge-red">⚠️ Low: {p.current_stock}</span>}
                    </div>
                    {p.product_name && <p className="font-semibold text-gray-800 dark:text-white mt-1 text-sm">{p.product_name}</p>}
                    {p.stock_id && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Stock: <Link href={`/stocks/${p.stock_id._id}`} className="text-primary hover:underline">{p.stock_id.stock_name}</Link>
                        {' · '}{fmtDate(p.stock_id.date_added)}
                      </p>
                    )}
                  </div>
                </div>
                {p.stock_id && (
                  <Link href={`/stocks/${p.stock_id._id}`} className="btn-secondary text-xs py-1.5 flex-shrink-0">Open →</Link>
                )}
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-sm">
                <div><p className="text-xs text-gray-400">Buy</p><p className="font-semibold">{fmt(p.buy_price)}</p></div>
                <div><p className="text-xs text-gray-400">Cost to Me</p><p className="font-semibold text-red-500">{fmt(p.cost_price)}</p></div>
                <div><p className="text-xs text-gray-400">Regular</p><p className="font-semibold">{fmt(p.regular_price)}</p><p className="text-xs text-green-600">+{fmtPct(p.profit_on_regular)}</p></div>
                <div><p className="text-xs text-gray-400">Discount</p><p className="font-semibold">{fmt(p.discount_price)}</p><p className={`text-xs ${(p.profit_on_discount||0)>=0?'text-green-600':'text-red-500'}`}>{fmtPct(p.profit_on_discount)}</p></div>
                <div><p className="text-xs text-gray-400">Qty Bought</p><p className="font-semibold">{p.quantity_bought}</p></div>
                <div><p className="text-xs text-gray-400">In Stock</p><p className={`font-bold ${(p.current_stock??0)<5?'text-red-500':'text-green-600'}`}>{p.current_stock??p.quantity_bought}</p></div>
              </div>
              {p.notes && <p className="text-xs text-gray-400 mt-2 italic">📝 {p.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {!searched && (
        <div className="card text-center py-14 text-gray-400">
          <p className="text-5xl mb-3">🔍</p>
          <p className="font-semibold text-gray-500">Start typing to search all stocks</p>
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            {['LIP','BAG','RING','EAR','HAR'].map(tag=>(
              <button key={tag} onClick={()=>{setQuery(tag);doSearch(tag)}}
                className="px-3 py-1.5 bg-violet-100 text-primary rounded-full text-xs font-semibold hover:bg-primary hover:text-white transition-all">
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
