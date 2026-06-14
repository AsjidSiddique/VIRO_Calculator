'use client'
import { useState } from 'react'
import { fmt, fmtPct } from '@/lib/format'

export default function Calculator() {
  const [buy,      setBuy]      = useState('')
  const [costPct,  setCostPct]  = useState('20')
  const [profitPct,setProfitPct]= useState('')
  const [sellIn,   setSellIn]   = useState('')
  const [discIn,   setDiscIn]   = useState('')
  const [qty,      setQty]      = useState('1')
  // Expected expenses
  const [mktPct,   setMktPct]   = useState('')
  const [codRetPct,setCodRetPct]= useState('')
  const [codCharge,setCodCharge]= useState('')
  // show/hide expenses panel
  const [showExp,  setShowExp]  = useState(false)

  const b    = parseFloat(buy)      || 0
  const mult = (parseFloat(costPct) || 0) / 100
  const cost = b * (1 + mult)
  const reg  = profitPct ? cost*(1+(parseFloat(profitPct)/100)) : (parseFloat(sellIn) || cost*2)
  const disc = parseFloat(discIn) || reg
  const n    = parseFloat(qty) || 1

  const pReg  = cost > 0 ? ((reg  - cost) / cost) * 100 : 0
  const pDisc = cost > 0 ? ((disc - cost) / cost) * 100 : 0
  const d10   = disc * 0.9
  const d15   = disc * 0.85
  const p10   = cost > 0 ? ((d10  - cost) / cost) * 100 : 0
  const p15   = cost > 0 ? ((d15  - cost) / cost) * 100 : 0

  // Effective cost breakdown
  const mktRate    = (parseFloat(mktPct)    || 0) / 100
  const codRetRate = (parseFloat(codRetPct) || 0) / 100
  const codFee     = parseFloat(codCharge)  || 0
  const mktCost    = disc * mktRate
  const codRetCost = disc * codRetRate
  const effectiveCost   = cost + mktCost + codRetCost + codFee
  const effectiveProfit = disc - effectiveCost
  const effectivePct    = effectiveCost > 0 ? (effectiveProfit / effectiveCost) * 100 : 0
  const hasExpenses = mktPct || codRetPct || codCharge

  const reset = () => {
    setBuy(''); setCostPct('20'); setProfitPct(''); setSellIn(''); setDiscIn(''); setQty('1')
    setMktPct(''); setCodRetPct(''); setCodCharge('')
  }

  return (
    <div className="space-y-5 slide-up max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🧮 Price Calculator</h1>
          <p className="text-gray-400 text-sm">Calculate sell price, profit & all deductions</p>
        </div>
        <button onClick={reset} className="btn-secondary text-sm">↺ Reset</button>
      </div>

      {/* ── Section 1: Core inputs ── */}
      <div className="card">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">📥 Core Inputs</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Buy Price (PKR) *</label>
            <input type="number" className="input" placeholder="500" value={buy}
              onChange={e => { setBuy(e.target.value); setSellIn('') }} />
          </div>
          <div>
            <label className="label">Cost % (rent, packaging…)</label>
            <div className="relative">
              <input type="number" className="input pr-7" placeholder="20" value={costPct}
                onChange={e => setCostPct(e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">From your stock cost ratio</p>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input type="number" className="input" placeholder="1" value={qty}
              onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <label className="label">Profit % → get sell price</label>
            <div className="relative">
              <input type="number" className="input pr-7" placeholder="100" value={profitPct}
                onChange={e => { setProfitPct(e.target.value); setSellIn('') }} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="label">OR Enter Sell Price</label>
            <input type="number" className="input" placeholder="1200" value={sellIn}
              onChange={e => { setSellIn(e.target.value); setProfitPct('') }} />
          </div>
          <div>
            <label className="label">Discount / Min Price</label>
            <input type="number" className="input" placeholder="900" value={discIn}
              onChange={e => setDiscIn(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Section 2: Expected expenses (collapsible) ── */}
      <div className="card">
        <button onClick={() => setShowExp(v => !v)}
          className="w-full flex items-center justify-between text-left">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            📊 Expected Expenses {hasExpenses ? '(active)' : '(optional)'}
          </p>
          <span className="text-gray-400 text-sm">{showExp ? '▲ Hide' : '▼ Show'}</span>
        </button>

        {showExp && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-gray-400">Add these to calculate your REAL profit after all deductions</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Marketing Spend (% of sell price)</label>
                <div className="relative">
                  <input type="number" className="input pr-7" placeholder="10" value={mktPct}
                    onChange={e => setMktPct(e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                {mktPct && disc > 0 && (
                  <p className="text-xs text-orange-500 mt-1">= {fmt(Math.round(disc * (parseFloat(mktPct)||0) / 100))} per unit</p>
                )}
              </div>
              <div>
                <label className="label">Expected COD Return Rate</label>
                <div className="relative">
                  <input type="number" className="input pr-7" placeholder="15" value={codRetPct}
                    onChange={e => setCodRetPct(e.target.value)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                {codRetPct && disc > 0 && (
                  <p className="text-xs text-red-400 mt-1">= {fmt(Math.round(disc * (parseFloat(codRetPct)||0) / 100))} loss per unit</p>
                )}
              </div>
              <div>
                <label className="label">COD Charge per Order (PKR)</label>
                <input type="number" className="input" placeholder="150" value={codCharge}
                  onChange={e => setCodCharge(e.target.value)} />
                {codCharge && <p className="text-xs text-orange-400 mt-1">Courier fee per delivered order</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {b > 0 && (
        <div className="card border-2 border-primary/10 space-y-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">📊 Results</p>

          {/* Formula */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 font-mono text-sm space-y-1">
            <p className="text-gray-600 dark:text-gray-300">
              {fmt(b)} × {(1+mult).toFixed(2)} = <span className="text-red-500 font-bold">{fmt(Math.round(cost))}</span>
              <span className="text-gray-400"> (cost to you after {(mult*100).toFixed(0)}% expenses)</span>
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              {fmt(Math.round(cost))} × {profitPct ? (1+parseFloat(profitPct)/100).toFixed(2) : '2.00'} = <span className="text-green-600 font-bold">{fmt(Math.round(reg))}</span>
              <span className="text-gray-400"> (sell price)</span>
            </p>
          </div>

          {/* Price cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-red-400 uppercase mb-1">Cost to You</p>
              <p className="text-xl font-bold text-red-600">{fmt(Math.round(cost))}</p>
              <p className="text-xs text-red-400 mt-1">per unit</p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-primary uppercase mb-1">Regular Price</p>
              <p className="text-xl font-bold text-primary">{fmt(Math.round(reg))}</p>
              <p className={`text-xs mt-1 font-semibold ${pReg>=0?'text-green-600':'text-red-500'}`}>
                {fmt(Math.round(reg-cost))} · {fmtPct(pReg)}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-green-600 uppercase mb-1">Discount / Min</p>
              <p className="text-xl font-bold text-green-700">{fmt(Math.round(disc))}</p>
              <p className={`text-xs mt-1 font-semibold ${pDisc>=0?'text-green-600':'text-red-500'}`}>
                {fmt(Math.round(disc-cost))} · {fmtPct(pDisc)}
              </p>
            </div>
          </div>

          {/* Event buffer */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">🎉 Event Pricing Buffer (off discount)</p>
            <div className="grid grid-cols-2 gap-3">
              {[{label:'Eid / -10%',price:d10,profit:p10},{label:'Sale / -15%',price:d15,profit:p15}].map(ev => (
                <div key={ev.label} className={`rounded-xl p-3 border ${ev.profit>=0?'bg-blue-50 dark:bg-blue-900/20 border-blue-100':'bg-red-50 dark:bg-red-900/20 border-red-100'}`}>
                  <p className="text-xs font-semibold text-gray-500">{ev.label}</p>
                  <p className="font-bold text-gray-800 dark:text-white">{fmt(Math.round(ev.price))}</p>
                  <p className={`text-xs font-semibold ${ev.profit>=0?'text-blue-600':'text-red-500'}`}>
                    {ev.profit>=0?`✅ ${fmtPct(ev.profit)} profit`:`❌ ${fmtPct(ev.profit)} LOSS`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Effective cost / real profit */}
          {hasExpenses && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 space-y-2 border border-orange-200 dark:border-orange-800">
              <p className="font-bold text-orange-700 dark:text-orange-400 text-sm">📊 Real Profit After All Deductions</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-center">
                <div>
                  <p className="text-xs text-gray-400">Stock Cost</p>
                  <p className="font-bold text-red-500">{fmt(Math.round(cost))}</p>
                </div>
                {mktPct && (
                  <div>
                    <p className="text-xs text-gray-400">Marketing {mktPct}%</p>
                    <p className="font-bold text-orange-600">+{fmt(Math.round(mktCost))}</p>
                  </div>
                )}
                {codRetPct && (
                  <div>
                    <p className="text-xs text-gray-400">COD Returns {codRetPct}%</p>
                    <p className="font-bold text-orange-600">+{fmt(Math.round(codRetCost))}</p>
                  </div>
                )}
                {codCharge && (
                  <div>
                    <p className="text-xs text-gray-400">Courier Fee</p>
                    <p className="font-bold text-orange-600">+{fmt(codFee)}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-orange-200 dark:border-orange-700">
                <div>
                  <p className="text-xs text-gray-500">Effective Cost</p>
                  <p className="font-bold text-orange-600">{fmt(Math.round(effectiveCost))}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Real Profit at Discount Price</p>
                  <p className={`font-bold text-xl ${effectiveProfit>=0?'text-green-600':'text-red-600'}`}>
                    {fmt(Math.round(effectiveProfit))}
                    <span className="text-sm ml-1">({fmtPct(effectivePct)})</span>
                  </p>
                </div>
              </div>
              {effectiveProfit < 0 && (
                <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-2 text-xs text-red-600 font-semibold text-center">
                  ❌ LOSS — Raise your price or reduce expenses!
                </div>
              )}
              {effectiveProfit >= 0 && effectivePct < 10 && (
                <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-2 text-xs text-yellow-700 font-semibold text-center">
                  ⚠️ Very thin margin — consider adjusting pricing
                </div>
              )}
            </div>
          )}

          {/* Batch totals */}
          {n > 1 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📦 Batch of {n} units</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { l:'Total Buy',     v:b*n,             c:'text-gray-800 dark:text-white' },
                  { l:'Total Cost',    v:cost*n,           c:'text-red-500' },
                  { l:'Total Revenue', v:disc*n,           c:'text-primary' },
                  { l:'Gross Profit',  v:(disc-cost)*n,    c:(disc-cost)>=0?'text-green-600':'text-red-500' },
                  ...(hasExpenses ? [{ l:'Real Profit', v:effectiveProfit*n, c:effectiveProfit>=0?'text-green-700':'text-red-600' }] : []),
                ].map(x=>(
                  <div key={x.l} className="card text-center py-3">
                    <p className="text-xs text-gray-400">{x.l}</p>
                    <p className={`font-bold ${x.c}`}>{fmt(Math.round(x.v))}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!b && (
        <div className="card text-center py-14 text-gray-400">
          <p className="text-5xl mb-3">🧮</p>
          <p className="font-semibold text-gray-500">Enter buy price to start calculating</p>
          <p className="text-sm mt-1">Use "Expected Expenses" to see your real profit after marketing + COD returns</p>
        </div>
      )}
    </div>
  )
}
