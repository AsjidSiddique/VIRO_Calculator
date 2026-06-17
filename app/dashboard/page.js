'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate } from '@/lib/format'

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg p-3 text-xs">
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  )
}

function Stat({ label, value, icon, color = 'violet' }) {
  const bg = { violet:'bg-violet-100 text-primary', green:'bg-green-100 text-green-600', red:'bg-red-100 text-red-600', yellow:'bg-yellow-100 text-yellow-600' }
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${bg[color]}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const [summary,    setSummary]    = useState(null)
  const [stocks,     setStocks]     = useState([])
  const [products,   setProducts]   = useState([])
  const [orderStats, setOrderStats] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [days,       setDays]       = useState(30)

  useEffect(() => { load() }, [days])

  const load = async () => {
    setLoading(true)
    try {
      const [sum, stk, prd, ord] = await Promise.all([
        api.get(`/daily?summary=1&days=${days}`),
        api.get('/stocks'),
        api.get('/products'),
        api.get(`/orders?summary=1&days=${days}`),
      ])
      setSummary(sum); setStocks(stk); setProducts(prd); setOrderStats(ord)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const totalInvested = stocks.reduce((s, st) => s + (st.total_buy_amount || 0), 0)
  const totalCost     = stocks.reduce((s, st) => s + (st.total_cost_amount || 0), 0)
  const lowStock      = products.filter(p => (p.current_stock ?? 0) < 5)
  const chartData     = (summary?.chart || []).map(r => ({
    date: fmtDate(r.date), Revenue: r.revenue, Profit: r.profit,
  }))

  if (loading) return (
    <div className="space-y-5 slide-up">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-28" />)}
      </div>
      <div className="skeleton h-64" />
    </div>
  )

  return (
    <div className="space-y-6 slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm">Viro.pk Business Overview</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="input w-auto text-sm py-2">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm">{lowStock.length} products low on stock</p>
            <p className="text-yellow-600 text-xs mt-0.5">{lowStock.slice(0,3).map(p => p.product_code).join(', ')}{lowStock.length > 3 ? ` +${lowStock.length-3} more` : ''}</p>
          </div>
          <Link href="/stocks" className="text-yellow-700 text-xs font-semibold hover:underline">View →</Link>
        </div>
      )}

      {/* Stats row 2 — Orders */}
      {orderStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label={`Orders (${days}d)`}    value={orderStats.total_orders}              icon="🛒" color="violet" />
          <Stat label="Order Revenue"           value={fmt(orderStats.total_revenue)}        icon="💳" color="green"  />
          <Stat label="Order Profit"            value={fmt(orderStats.total_profit)}         icon="💰" color={orderStats.total_profit>=0?'green':'red'} />
          <Stat label="Returns Loss"            value={fmt(summary?.total_returns||0)}       icon="↩️" color="red"    />
        </div>
      )}

      {/* Stats row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Invested"      value={fmt(totalInvested)}        icon="💰" color="violet" />
        <Stat label="Total Cost"          value={fmt(totalCost)}            icon="📊" color="yellow" />
        <Stat label={`Revenue (${days}d)`} value={fmt(summary?.total_revenue)} icon="📈" color="green"  />
        <Stat label={`Net Profit (${days}d)`} value={fmt(summary?.total_profit)} icon={summary?.total_profit >= 0 ? '✅' : '📉'} color={summary?.total_profit >= 0 ? 'green' : 'red'} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Returns Loss"  value={fmt(summary?.total_returns)} icon="↩️"  color="red"    />
        <Stat label="Total Products" value={products.length}            icon="🏷️" color="violet" />
        <Stat label="Total Stocks"  value={stocks.length}               icon="📦" color="yellow" />
        <Stat label="Low Stock"     value={lowStock.length}             icon="⚠️" color="red"    />
      </div>

      {/* Chart */}
      <div className="card">
        <h2 className="font-bold text-gray-800 dark:text-white mb-4">Revenue & Profit — Last {days} days</h2>
        {chartData.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-sm">No records yet. <Link href="/daily" className="text-primary font-semibold">Add daily record →</Link></p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<Tip />} />
              <Line type="monotone" dataKey="Revenue" stroke="#7C3AED" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Profit"  stroke="#10B981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary inline-block rounded" />Revenue</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />Profit</span>
        </div>
      </div>

      {/* Recent stocks */}
      {stocks.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 dark:text-white">Recent Stocks</h2>
            <Link href="/stocks" className="text-primary text-sm font-semibold hover:underline">All →</Link>
          </div>
          <div className="space-y-2">
            {stocks.slice(0,4).map(s => (
              <Link key={s._id} href={`/stocks/${s._id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center text-base">📦</span>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-white group-hover:text-primary transition-colors">{s.stock_name}</p>
                    <p className="text-xs text-gray-400">{fmtDate(s.date_added)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{fmt(s.total_buy_amount)}</p>
                  <p className="text-xs text-gray-400">invested</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href:'/stocks',     icon:'📦', label:'New Stock',    bg:'bg-violet-100 text-primary' },
          { href:'/orders',     icon:'🛒', label:'New Order',    bg:'bg-green-100 text-green-700' },
          { href:'/daily',      icon:'📅', label:'Daily Record', bg:'bg-blue-100 text-blue-700' },
          { href:'/calculator', icon:'🧮', label:'Calculator',   bg:'bg-yellow-100 text-yellow-700' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="card hover:shadow-md transition-all active:scale-95 flex flex-col items-center gap-2 py-4">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${a.bg}`}>{a.icon}</span>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
