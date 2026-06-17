'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate, fmtPct, csvDownload } from '@/lib/format'
import { toast } from '@/components/Toast'

const PRODUCT_CATS = ['Jewellery','Bags','Cosmetics','Hair Accessories','Clothing','Shoes','Other']
const COST_CATS    = ['Rent','Travelling','Marketing/Ads','Packaging','Salary','Interest','COD Charges','Other']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/* ══════════════════════════════════════════════════
   MERGED SUMMARY PANEL — Purchase + Cost Ratio in one
   Both sides use EXACTLY the same totalBuy from batches prop
   This eliminates any possibility of mismatch
══════════════════════════════════════════════════ */
function StockSummaryPanel({ batches, costs }) {
  // Single source of truth — computed once, used by both sides
  const totalBuy   = batches.reduce((s, b) => s + (Number(b.buy_amount) || 0), 0)
  const totalInt   = batches.reduce((s, b) => s + (Number(b.interest_amount) || 0), 0)
  const totalCosts = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const ratio      = totalBuy > 0 ? (totalCosts / totalBuy) * 100 : 0
  const multiplier = totalBuy > 0 ? totalCosts / totalBuy : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* LEFT — Net Purchase */}
      <div className="card bg-gradient-to-br from-violet-50 to-white dark:from-gray-800 dark:to-gray-900 border border-primary/20">
        <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-3">📦 Net Purchase Summary</h3>
        <div className="space-y-1.5 text-sm">
          {batches.map(b => (
            <div key={b._id} className="flex items-center justify-between py-1">
              <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span className="badge-yellow text-xs">{b.category || 'Batch'}</span>
                {b.batch_name}
              </span>
              <div className="text-right">
                <span className="font-semibold">{fmt(b.buy_amount)}</span>
                {(b.interest_amount || 0) > 0 && (
                  <span className="text-orange-500 text-xs ml-2">+{fmt(b.interest_amount)} int.</span>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-between pt-2 mt-1 border-t border-gray-200 dark:border-gray-600 font-bold">
            <span>Total Purchase</span>
            <span className="text-primary">
              {fmt(totalBuy)}
              {totalInt > 0 && <span className="text-orange-400 text-xs ml-1">+{fmt(totalInt)} int.</span>}
            </span>
          </div>
        </div>
        {batches.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Add purchase batches</p>}
      </div>

      {/* RIGHT — Cost Ratio — uses SAME totalBuy computed above */}
      <div className="card bg-gradient-to-br from-yellow-50 to-white dark:from-gray-800 dark:to-gray-900">
        <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-3">💰 Cost Ratio Calculation</h3>
        <div className="space-y-1.5 text-sm">
          {costs.map(c => (
            <div key={c._id} className="flex justify-between py-1">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <span>{c.category==='Rent'?'🏠':c.category==='Marketing/Ads'?'📢':c.category==='Packaging'?'📦':c.category==='Salary'?'👤':c.category==='Travelling'?'🚗':c.category==='Interest'?'💳':c.category==='COD Charges'?'🚚':'💰'}</span>
                {c.name}
                {c.parts?.length>0 && <span className="text-xs text-gray-400">({c.parts.map(p=>fmt(p.amount)).join('+')})</span>}
              </span>
              <span className="font-semibold">{fmt(c.amount)}</span>
            </div>
          ))}
          {costs.length > 0 && (
            <>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600 text-xs">
                <span className="text-gray-500">Total Costs</span>
                <span className="font-bold text-yellow-600">{fmt(totalCosts)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Total Purchase (from batches)</span>
                <span className="font-bold text-primary">{fmt(totalBuy)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                <span className="text-xs text-gray-500">
                  Cost Ratio = ({fmt(totalCosts)} ÷ {fmt(totalBuy)}) × 100
                </span>
                <span className="font-bold text-primary text-lg">{ratio.toFixed(1)}%</span>
              </div>
              <div className="bg-primary/5 rounded-lg px-3 py-2 text-xs text-gray-500">
                Every Rs.100 you buy → costs <b>Rs.{(100+ratio).toFixed(1)}</b> after expenses
                <br/><span className="text-gray-400">Multiplier: ×{(1+multiplier).toFixed(4)}</span>
              </div>
            </>
          )}
          {costs.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No costs added yet</p>}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   QUICK STOCK MODAL — with date + movement history
══════════════════════════════════════════════════ */
function QuickModal({ product, onClose, onSave }) {
  const [qty, setQty]         = useState('')
  const [type, setType]       = useState('sold')
  const [date, setDate]       = useState(todayStr())
  const [note, setNote]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [movements, setMovements] = useState([])
  const [loadingMov, setLoadingMov] = useState(true)
  const [showHist, setShowHist]   = useState(false)

  useEffect(() => {
    api.get(`/movements?product_id=${product._id}`)
      .then(setMovements).catch(() => {}).finally(() => setLoadingMov(false))
  }, [product._id])

  const n          = parseInt(qty) || 0
  const sellPrice  = product.discount_price || product.regular_price || 0
  const costPrice  = product.cost_price || product.buy_price || 0
  const revenue    = sellPrice * n
  const profit     = (sellPrice - costPrice) * n
  const profitPct  = costPrice > 0 ? ((sellPrice - costPrice) / costPrice) * 100 : 0
  const stockAfter = Math.max(0, (product.current_stock ?? 0) + (type === 'sold' ? -n : n))

  const handle = async () => {
    if (!n || n <= 0) return toast.error('Enter a valid quantity')
    setSaving(true)
    try {
      const updated = await api.patch(`/products/${product._id}`, {
        qty_change: type === 'sold' ? -n : n,
        type, date, note,
      })
      onSave(updated)
      toast.success(type === 'sold' ? `✅ ${n} marked sold` : `📦 ${n} added to stock`)
      onClose()
    } catch (e) { toast.error(e.message) }
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

        {/* Sold / Add toggle */}
        <div className="flex gap-2 mb-3">
          {[['sold', '📤 Sold'], ['add', '📥 Add']].map(([t, label]) => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${type === t ? (t === 'sold' ? 'bg-primary text-white shadow-md' : 'bg-green-600 text-white shadow-md') : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Quantity */}
        <label className="label">Quantity *</label>
        <input type="number" min="1" className="input mb-3" placeholder="e.g. 3"
          value={qty} onChange={e => setQty(e.target.value)} autoFocus
          onKeyDown={e => e.key === 'Enter' && handle()} />

        {/* Date */}
        <label className="label">Date</label>
        <input type="date" className="input mb-3" value={date}
          onChange={e => setDate(e.target.value)} />

        {/* Note */}
        <label className="label">Note (optional)</label>
        <input className="input mb-4" placeholder="e.g. WhatsApp order, walk-in…"
          value={note} onChange={e => setNote(e.target.value)} />

        {/* Live profit preview when selling */}
        {type === 'sold' && n > 0 && sellPrice > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4 text-sm space-y-1.5">
            <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">📊 This Sale Preview</p>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Revenue ({n} × {fmt(sellPrice)})</span><b>{fmt(revenue)}</b>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Cost ({n} × {fmt(Math.round(costPrice))})</span><b className="text-red-500">-{fmt(Math.round(costPrice * n))}</b>
            </div>
            <div className="flex justify-between border-t border-green-200 pt-1.5">
              <span className="font-bold">Profit</span>
              <b className={profit >= 0 ? 'text-green-700' : 'text-red-600'}>
                {fmt(Math.round(profit))} ({fmtPct(profitPct)})
              </b>
            </div>
            <p className="text-xs text-gray-400">Stock after: <b>{stockAfter}</b></p>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button onClick={handle} disabled={saving || !n}
            className="btn-primary flex-1 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>

        {/* Movement history */}
        <button onClick={() => setShowHist(h => !h)}
          className="w-full text-xs text-gray-400 hover:text-primary py-1.5 border-t border-gray-100 dark:border-gray-700 transition-colors">
          {showHist ? '▲ Hide' : '▼ Show'} movement history ({movements.length})
        </button>

        {showHist && (
          <div className="mt-2 space-y-1 max-h-52 overflow-y-auto">
            {loadingMov && <p className="text-xs text-gray-400 text-center py-3">Loading…</p>}
            {!loadingMov && movements.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">No movements recorded yet</p>
            )}
            {movements.map(m => (
              <div key={m._id} className="flex items-start justify-between text-xs py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-1.5">
                  <span>{m.type === 'sold' ? '📤' : m.type === 'add' ? '📥' : '↩️'}</span>
                  <span className={`font-bold ${m.type === 'sold' ? 'text-red-500' : 'text-green-600'}`}>
                    {m.type === 'sold' ? '-' : '+'}{m.qty}
                  </span>
                  {m.note && <span className="text-gray-400 italic truncate max-w-[100px]">{m.note}</span>}
                </div>
                <div className="text-right text-gray-400 flex-shrink-0 ml-2">
                  <p className="font-medium text-gray-600 dark:text-gray-300">
                    {new Date(m.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}
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

/* ══════════════════════════════════════════════════
   PRODUCT FORM
══════════════════════════════════════════════════ */
function ProductForm({ stockId, batches, costMultiplier, onSave, onCancel, initial }) {
  const blank = {
    product_code: '', product_name: '', category: '', batch_id: '',
    buy_price: '', quantity_bought: '', quantity_sold: '0',
    regular_price: '', discount_price: '', notes: '',
    expected_marketing_pct: '', expected_cod_return_pct: '', cod_charge_per_order: '',
  }
  const [form, setForm] = useState(initial ? {
    product_code: initial.product_code,
    product_name: initial.product_name || '',
    category: initial.category || '',
    batch_id: initial.batch_id || '',
    buy_price: initial.buy_price,
    quantity_bought: initial.quantity_bought,
    quantity_sold: initial.quantity_sold != null
      ? initial.quantity_sold
      : (initial.quantity_bought - (initial.current_stock ?? initial.quantity_bought)),
    regular_price: initial.regular_price || '',
    discount_price: initial.discount_price || '',
    notes: initial.notes || '',
    expected_marketing_pct: initial.expected_marketing_pct || '',
    expected_cod_return_pct: initial.expected_cod_return_pct || '',
    cod_charge_per_order: initial.cod_charge_per_order || '',
  } : blank)
  const [saving, setSaving] = useState(false)

  const f   = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const buy  = parseFloat(form.buy_price) || 0
  const mult = costMultiplier || 0
  const cost = buy * (1 + mult)
  const reg  = parseFloat(form.regular_price) || (cost > 0 ? Math.round(cost * 2) : 0)
  const disc = parseFloat(form.discount_price) || reg
  const pReg  = cost > 0 ? ((reg  - cost) / cost) * 100 : 0
  const pDisc = cost > 0 ? ((disc - cost) / cost) * 100 : 0
  const p10   = cost > 0 ? ((disc * 0.9  - cost) / cost) * 100 : 0
  const p15   = cost > 0 ? ((disc * 0.85 - cost) / cost) * 100 : 0

  const mktPct    = parseFloat(form.expected_marketing_pct) || 0
  const codRetPct = parseFloat(form.expected_cod_return_pct) || 0
  const codCharge = parseFloat(form.cod_charge_per_order) || 0
  const effCost   = cost + disc * (mktPct / 100) + disc * (codRetPct / 100) + codCharge
  const effProfit = disc - effCost
  const effPct    = effCost > 0 ? (effProfit / effCost) * 100 : 0

  const qtyBought = parseInt(form.quantity_bought) || 0
  const qtySold   = parseInt(form.quantity_sold) || 0
  const currentStock = Math.max(0, qtyBought - qtySold)

  const handleSubmit = async () => {
    if (!form.product_code || !form.buy_price || !form.quantity_bought)
      return toast.error('Code, buy price & quantity required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        stock_id: stockId,
        quantity_sold: qtySold,
        current_stock: currentStock,
      }
      const data = initial?._id
        ? await api.put(`/products/${initial._id}`, payload)
        : await api.post('/products', payload)
      onSave(data)
      toast.success(initial ? 'Product updated!' : 'Product added!')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="card border-2 border-primary/20 slide-up space-y-4">
      <h3 className="font-bold text-gray-800 dark:text-white text-base">
        {initial ? '✏️ Edit Product' : '➕ Add Product'}
      </h3>

      {/* Basic info */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Basic Info</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Product Code *</label>
            <input className="input uppercase" placeholder="LIP01" value={form.product_code}
              onChange={e => f('product_code', e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" placeholder="Product name" value={form.product_name}
              onChange={e => f('product_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" placeholder="Jewellery, Bags…" value={form.category}
              list="pcat-list" onChange={e => f('category', e.target.value)} />
            <datalist id="pcat-list">{PRODUCT_CATS.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          {batches.length > 0 && (
            <div className="col-span-2 md:col-span-3">
              <label className="label">Purchase Batch</label>
              <select className="input" value={form.batch_id} onChange={e => f('batch_id', e.target.value)}>
                <option value="">— None —</option>
                {batches.map(b => <option key={b._id} value={b._id}>{b.batch_name} ({fmt(b.buy_amount)})</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Purchase & pricing */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Purchase & Pricing</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Buy Price (PKR) *</label>
            <input type="number" className="input" placeholder="500" value={form.buy_price}
              onChange={e => f('buy_price', e.target.value)} />
          </div>
          <div>
            <label className="label">Qty Bought *</label>
            <input type="number" className="input" placeholder="10" value={form.quantity_bought}
              onChange={e => f('quantity_bought', e.target.value)} />
          </div>
          <div>
            <label className="label">Qty Already Sold</label>
            <input type="number" className="input" placeholder="0" value={form.quantity_sold}
              onChange={e => f('quantity_sold', e.target.value)} />
            {qtySold > 0 && qtyBought > 0 && (
              <p className="text-xs text-green-600 mt-1 font-medium">✓ In stock: {currentStock}</p>
            )}
          </div>
          <div>
            <label className="label">Regular Price</label>
            <input type="number" className="input" placeholder={Math.round(cost * 2) || ''}
              value={form.regular_price} onChange={e => f('regular_price', e.target.value)} />
          </div>
          <div>
            <label className="label">Discount / Min Price</label>
            <input type="number" className="input" placeholder={Math.round(reg * 0.85) || ''}
              value={form.discount_price} onChange={e => f('discount_price', e.target.value)} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" placeholder="Any notes…" value={form.notes}
              onChange={e => f('notes', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Expected expenses */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📊 Expected Expenses (for real profit)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Marketing % of sell price</label>
            <div className="relative">
              <input type="number" className="input pr-7" placeholder="10" value={form.expected_marketing_pct}
                onChange={e => f('expected_marketing_pct', e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="label">COD Return Rate %</label>
            <div className="relative">
              <input type="number" className="input pr-7" placeholder="15" value={form.expected_cod_return_pct}
                onChange={e => f('expected_cod_return_pct', e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="label">COD Charge/order (PKR)</label>
            <input type="number" className="input" placeholder="150" value={form.cod_charge_per_order}
              onChange={e => f('cod_charge_per_order', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Live calculation */}
      {buy > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">📊 Live Calculation</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-center">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Buy Price</p>
              <p className="font-bold">{fmt(buy)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Cost to Me</p>
              <p className="font-bold text-red-500">{fmt(Math.round(cost))}</p>
              <p className="text-xs text-gray-400">×{(1 + mult).toFixed(4)}</p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Regular → Profit</p>
              <p className="font-bold text-primary">{fmt(reg)}</p>
              <p className={`text-xs font-semibold ${pReg >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {fmtPct(pReg)}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Discount → Profit</p>
              <p className="font-bold text-green-700">{fmt(disc)}</p>
              <p className={`text-xs font-semibold ${pDisc >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {fmtPct(pDisc)}
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap text-xs">
            <span className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
              Eid -10%: <b>{fmt(Math.round(disc * 0.9))}</b> → <span className={p10 >= 0 ? 'text-green-600' : 'text-red-500'}>{fmtPct(p10)}</span>
            </span>
            <span className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
              Sale -15%: <b>{fmt(Math.round(disc * 0.85))}</b> → <span className={p15 >= 0 ? 'text-green-600' : 'text-red-500'}>{fmtPct(p15)}</span>
            </span>
            <span className="text-gray-400">Total buy: <b>{fmt(Math.round(buy * qtyBought))}</b></span>
          </div>
          {(mktPct > 0 || codRetPct > 0 || codCharge > 0) && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-xs space-y-1.5">
              <p className="font-bold text-orange-700 dark:text-orange-400">📊 Real Profit After All Deductions</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
                <span>Stock cost: <b>{fmt(Math.round(cost))}</b></span>
                {mktPct > 0 && <span>Marketing: <b>+{fmt(Math.round(disc * mktPct / 100))}</b></span>}
                {codRetPct > 0 && <span>Returns: <b>+{fmt(Math.round(disc * codRetPct / 100))}</b></span>}
                {codCharge > 0 && <span>COD fee: <b>+{fmt(codCharge)}</b></span>}
              </div>
              <div className="flex justify-between pt-1 border-t border-orange-200">
                <span className="font-bold">Real profit at {fmt(disc)}</span>
                <span className={`font-bold text-base ${effProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(Math.round(effProfit))} ({fmtPct(effPct)})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : initial ? '✅ Update' : '✅ Add Product'}
        </button>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   BATCHES TAB
══════════════════════════════════════════════════ */
function BatchesTab({ stockId, onBatchesChange }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving]   = useState(false)
  const empty = { batch_name: '', category: '', date_purchased: todayStr(), buy_amount: '', interest_rate: '0', notes: '' }
  const [form, setForm] = useState(empty)

  const load = useCallback(async () => {
    setLoading(true)
    try { setBatches(await api.get(`/batches?stock_id=${stockId}`)) }
    finally { setLoading(false) }
  }, [stockId])

  useEffect(() => { load() }, [load])

  const buy  = parseFloat(form.buy_amount) || 0
  const rate = parseFloat(form.interest_rate) || 0
  const intA = (buy * rate) / 100

  const handleSave = async () => {
    if (!form.batch_name || !form.buy_amount) return toast.error('Name and amount required')
    setSaving(true)
    try {
      let b
      if (editing) {
        b = await api.put(`/batches/${editing}`, { ...form, stock_id: stockId })
        setBatches(prev => prev.map(x => x._id === editing ? b : x))
        toast.success('Batch updated!')
      } else {
        b = await api.post('/batches', { ...form, stock_id: stockId })
        setBatches(prev => [b, ...prev])
        toast.success('Batch added!')
      }
      setForm(empty); setShowAdd(false); setEditing(null)
      onBatchesChange(editing
        ? batches.map(x => x._id === editing ? b : x)
        : [b, ...batches])
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!confirm('Delete this batch?')) return
    await api.delete(`/batches/${id}`)
    const next = batches.filter(b => b._id !== id)
    setBatches(next); onBatchesChange(next)
    toast.success('Deleted')
  }

  const handleEdit = b => {
    setForm({
      batch_name: b.batch_name, category: b.category || '',
      date_purchased: new Date(b.date_purchased).toISOString().slice(0, 10),
      buy_amount: b.buy_amount, interest_rate: b.interest_rate || '0', notes: b.notes || '',
    })
    setEditing(b._id); setShowAdd(true)
  }

  const totalBuy = batches.reduce((s, b) => s + (Number(b.buy_amount) || 0), 0)
  const totalInt = batches.reduce((s, b) => s + (Number(b.interest_amount) || 0), 0)

  if (loading) return <div className="skeleton h-24" />

  return (
    <div className="space-y-3">
      {batches.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center py-3"><p className="text-xs text-gray-400 mb-1">Total Bought</p><p className="font-bold text-primary">{fmt(totalBuy)}</p></div>
          <div className="card text-center py-3"><p className="text-xs text-gray-400 mb-1">Interest</p><p className="font-bold text-orange-500">{fmt(totalInt)}</p></div>
          <div className="card text-center py-3"><p className="text-xs text-gray-400 mb-1">Grand Total</p><p className="font-bold text-red-500">{fmt(totalBuy + totalInt)}</p></div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{batches.length} purchase batches</p>
        <button onClick={() => { setShowAdd(true); setEditing(null); setForm(empty) }}
          className="btn-primary text-sm">+ Add Batch</button>
      </div>

      {showAdd && (
        <div className="card border-2 border-primary/20 slide-up">
          <h3 className="font-bold mb-3">{editing ? '✏️ Edit Batch' : '📦 New Purchase Batch'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="label">Batch Name *</label>
              <input className="input" placeholder="Bags, Jewellery…" value={form.batch_name}
                onChange={e => setForm(f => ({ ...f, batch_name: e.target.value }))} autoFocus /></div>
            <div><label className="label">Category</label>
              <input className="input" placeholder="Bags" value={form.category} list="bcat"
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              <datalist id="bcat">{PRODUCT_CATS.map(c => <option key={c} value={c} />)}</datalist></div>
            <div><label className="label">Date Purchased</label>
              <input type="date" className="input" value={form.date_purchased}
                onChange={e => setForm(f => ({ ...f, date_purchased: e.target.value }))} /></div>
            <div><label className="label">Buy Amount (PKR) *</label>
              <input type="number" className="input" placeholder="41000" value={form.buy_amount}
                onChange={e => setForm(f => ({ ...f, buy_amount: e.target.value }))} /></div>
            <div><label className="label">Interest Rate % (credit)</label>
              <div className="relative">
                <input type="number" className="input pr-7" placeholder="0" value={form.interest_rate}
                  onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div></div>
            <div><label className="label">Notes</label>
              <input className="input" placeholder="Supplier…" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          {buy > 0 && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm flex flex-wrap gap-x-5 gap-y-1">
              <span>Buy: <b>{fmt(buy)}</b></span>
              {rate > 0 && <span className="text-orange-500">Interest {rate}%: <b>+{fmt(Math.round(intA))}</b></span>}
              <span className="font-bold text-primary">Total: {fmt(Math.round(buy + intA))}</span>
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editing ? '✅ Update' : '✅ Add Batch'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditing(null); setForm(empty) }}
              className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {batches.length === 0 && !showAdd && (
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">📦</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300">No batches yet</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-3 text-sm">+ Add First Batch</button>
        </div>
      )}

      {batches.map(b => (
        <div key={b._id} className="card hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📦</div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-800 dark:text-white">{b.batch_name}</p>
                  {b.category && <span className="badge-yellow text-xs">{b.category}</span>}
                </div>
                <p className="text-xs text-gray-400">{fmtDate(b.date_purchased)}{b.notes ? ` · ${b.notes}` : ''}</p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => handleEdit(b)}
                className="bg-gray-100 dark:bg-gray-700 text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 text-sm">✏️</button>
              <button onClick={() => handleDelete(b._id)}
                className="text-red-400 hover:text-red-600 p-1.5 text-sm">🗑️</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-center text-sm">
            <div><p className="text-xs text-gray-400">Buy Amount</p><p className="font-bold">{fmt(b.buy_amount)}</p></div>
            <div><p className="text-xs text-gray-400">Interest ({b.interest_rate || 0}%)</p><p className="font-bold text-orange-500">{fmt(b.interest_amount || 0)}</p></div>
            <div><p className="text-xs text-gray-400">Total</p><p className="font-bold text-red-500">{fmt((b.buy_amount || 0) + (b.interest_amount || 0))}</p></div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   COSTS TAB
══════════════════════════════════════════════════ */
function CostsTab({ stockId, costs, setCosts, onCostsChange }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const empty = { name: '', amount: '', category: 'Other', type: 'fixed', parts: [] }
  const [form, setForm] = useState(empty)
  const [parts, setParts] = useState([])

  const partsSum = parts.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)

  const handleSave = async () => {
    if (!form.name) return toast.error('Name required')
    const finalAmt = parts.length > 0 ? partsSum : (parseFloat(form.amount) || 0)
    if (!finalAmt) return toast.error('Amount required')
    try {
      const payload = { ...form, amount: finalAmt, parts: parts.filter(p => p.amount), stock_id: stockId }
      let next
      if (editing) {
        const c = await api.put(`/costs/${editing}`, payload)
        next = costs.map(x => x._id === editing ? c : x)
        toast.success('Cost updated!')
      } else {
        const c = await api.post('/costs', payload)
        next = [...costs, c]
        toast.success('Cost added!')
      }
      setCosts(next); onCostsChange(next)
      setForm(empty); setParts([]); setShowAdd(false); setEditing(null)
    } catch (e) { toast.error(e.message) }
  }

  const handleEdit = c => {
    setForm({ name: c.name, amount: c.amount, category: c.category, type: c.type, parts: [] })
    setParts(c.parts?.length > 0 ? c.parts.map(p => ({ label: p.label || '', amount: p.amount })) : [])
    setEditing(c._id); setShowAdd(true)
  }

  const handleDelete = async id => {
    await api.delete(`/costs/${id}`)
    const next = costs.filter(c => c._id !== id)
    setCosts(next); onCostsChange(next)
    toast.success('Removed')
  }

  const totalCosts = costs.reduce((s, c) => s + c.amount, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{costs.length} costs · Total: <b>{fmt(totalCosts)}</b></p>
        <button onClick={() => { setShowAdd(true); setEditing(null); setForm(empty); setParts([]) }}
          className="btn-primary text-sm">+ Add Cost</button>
      </div>

      {showAdd && (
        <div className="card border-2 border-primary/20 slide-up space-y-3">
          <h3 className="font-bold">{editing ? '✏️ Edit Cost' : '💰 Add Cost'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="label">Category</label>
              <select className="input" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value, name: f.name || e.target.value }))}>
                {COST_CATS.map(c => <option key={c}>{c}</option>)}
              </select></div>
            <div><label className="label">Label *</label>
              <input className="input" placeholder="June Rent" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="label">Type</label>
              <select className="input" value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="fixed">Fixed</option>
                <option value="per_unit">Per Unit</option>
              </select></div>
            {parts.length === 0 && (
              <div><label className="label">Amount (PKR)</label>
                <input type="number" className="input" placeholder="5000" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                💡 Breakdown (e.g. Rent = 350+2500+200)
              </p>
              <button onClick={() => setParts(p => [...p, { label: '', amount: '' }])}
                className="text-primary text-xs font-semibold hover:underline">+ Add Part</button>
            </div>
            {parts.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className="input text-sm flex-1" placeholder="Label" value={p.label}
                  onChange={e => setParts(p => { const a = [...p]; a[i] = { ...a[i], label: e.target.value }; return a })} />
                <input type="number" className="input text-sm w-32" placeholder="Amount" value={p.amount}
                  onChange={e => setParts(p => { const a = [...p]; a[i] = { ...a[i], amount: e.target.value }; return a })} />
                <button onClick={() => setParts(p => p.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-600 px-2 text-sm">✕</button>
              </div>
            ))}
            {parts.length > 0 && (
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm flex items-center gap-2">
                <span className="text-gray-500">Sum:</span>
                <span className="font-bold text-yellow-700">{fmt(partsSum)}</span>
                <span className="text-xs text-gray-400">
                  ({parts.filter(p => p.amount).map(p => fmt(p.amount)).join(' + ')})
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="btn-primary">{editing ? '✅ Update' : '✅ Add Cost'}</button>
            <button onClick={() => { setShowAdd(false); setEditing(null); setForm(empty); setParts([]) }}
              className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {costs.length === 0 && !showAdd && (
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">💰</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300">No costs yet</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-3 text-sm">+ Add Cost</button>
        </div>
      )}

      {costs.map(c => (
        <div key={c._id} className="card flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="w-9 h-9 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
              {c.category === 'Rent' ? '🏠' : c.category === 'Marketing/Ads' ? '📢' : c.category === 'Packaging' ? '📦' : c.category === 'Salary' ? '👤' : c.category === 'Travelling' ? '🚗' : c.category === 'Interest' ? '💳' : c.category === 'COD Charges' ? '🚚' : '💰'}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-800 dark:text-white">{c.name}</p>
              <p className="text-xs text-gray-400">{c.category} · {c.type}</p>
              {c.parts?.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.parts.map(p => `${p.label ? p.label + ': ' : ''}${fmt(p.amount)}`).join(' + ')} = {fmt(c.amount)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <p className="font-bold">{fmt(c.amount)}</p>
            <button onClick={() => handleEdit(c)}
              className="bg-gray-100 dark:bg-gray-700 text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 text-sm">✏️</button>
            <button onClick={() => handleDelete(c._id)}
              className="text-red-400 hover:text-red-600 p-1 text-sm">🗑️</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export default function StockDetail() {
  const { id } = useParams()
  const [stock, setStock]       = useState(null)
  const [products, setProducts] = useState([])
  const [costs, setCosts]       = useState([])
  const [batches, setBatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('products')
  const [showAdd, setShowAdd]   = useState(false)
  const [editing, setEditing]   = useState(null)
  const [quickP, setQuickP]     = useState(null)
  const [search, setSearch]     = useState('')
  const [catFilt, setCatFilt]   = useState('All')
  const [sortBy, setSortBy]     = useState('code')
  const [recalcing, setRecalcing] = useState(false)
  const autoRecalcDone = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [stks, prds, csts, bats] = await Promise.all([
        api.get('/stocks'),
        api.get(`/products?stock_id=${id}`),
        api.get(`/costs?stock_id=${id}`),
        api.get(`/batches?stock_id=${id}`),
      ])
      const stk = stks.find(s => s._id === id)
      setStock(stk); setProducts(prds); setCosts(csts); setBatches(bats)

      // Auto-recalc ONCE if batch sum differs from DB value
      if (!autoRecalcDone.current && bats.length > 0 && stk) {
        const batchSum = bats.reduce((s, b) => s + (Number(b.buy_amount) || 0), 0)
        if (Math.abs(batchSum - (stk.total_buy_amount || 0)) > 0.5) {
          autoRecalcDone.current = true
          api.patch(`/stocks/${id}`, {}).then(updated => {
            if (updated?._id) setStock(updated)
          }).catch(() => {})
        }
      }
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRecalc = async () => {
    setRecalcing(true)
    try {
      const s = await api.patch(`/stocks/${id}`, {})
      setStock(s)
      toast.success(`✅ Recalculated! Cost ratio: ${((s.cost_multiplier || 0) * 100).toFixed(1)}%`)
      load()
    } catch (e) { toast.error(e.message) }
    finally { setRecalcing(false) }
  }

  const onProductSave = p => {
    setProducts(prev => {
      const idx = prev.findIndex(x => x._id === p._id)
      if (idx >= 0) { const a = [...prev]; a[idx] = p; return a }
      return [p, ...prev]
    })
    setShowAdd(false); setEditing(null)
  }

  const deleteProduct = async p => {
    if (!confirm(`Delete ${p.product_code}?`)) return
    await api.delete(`/products/${p._id}`)
    setProducts(prev => prev.filter(x => x._id !== p._id))
    toast.success('Deleted')
  }

  const exportCSV = () => {
    if (!products.length) return toast.error('No products')
    csvDownload(products.map(p => ({
      Code: p.product_code, Name: p.product_name || '', Category: p.category || '',
      'Buy Price': p.buy_price, 'Qty Bought': p.quantity_bought,
      'Qty Sold': p.quantity_sold || 0, 'In Stock': p.current_stock ?? 0,
      'Cost to Me': Math.round(p.cost_price || 0),
      Regular: p.regular_price, Discount: p.discount_price,
      'Profit% Reg': p.profit_on_regular?.toFixed(1),
      'Profit% Disc': p.profit_on_discount?.toFixed(1),
    })), `${stock?.stock_name || 'stock'}-products.csv`)
    toast.success('CSV exported!')
  }

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="skeleton h-20" />)}
    </div>
  )
  if (!stock) return (
    <div className="card text-center py-10">
      <p className="text-gray-400">Stock not found</p>
      <Link href="/stocks" className="btn-primary mt-4 inline-block">← Back</Link>
    </div>
  )

  // ── Live calculations — ALWAYS from fetched arrays, NEVER from stale DB fields ──
  const totalBuy       = batches.reduce((s, b) => s + (Number(b.buy_amount) || 0), 0)
  const totalCosts     = costs.reduce((s, c)   => s + (Number(c.amount) || 0), 0)
  const totalCostToYou = totalBuy + totalCosts
  const costRatioLive  = totalBuy > 0 ? (totalCosts / totalBuy) * 100 : 0
  const costMultLive   = totalBuy > 0 ? totalCosts / totalBuy : 0

  const prodCats = ['All', ...new Set(products.map(p => p.category).filter(Boolean))]
  let filtered = products.filter(p => {
    const ms = !search ||
      p.product_code?.toLowerCase().includes(search.toLowerCase()) ||
      p.product_name?.toLowerCase().includes(search.toLowerCase())
    const mc = catFilt === 'All' || p.category?.toLowerCase() === catFilt.toLowerCase()
    return ms && mc
  })
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'profit') return (b.profit_on_discount || 0) - (a.profit_on_discount || 0)
    if (sortBy === 'stock')  return (a.current_stock || 0) - (b.current_stock || 0)
    if (sortBy === 'price')  return (a.buy_price || 0) - (b.buy_price || 0)
    return (a.product_code || '').localeCompare(b.product_code || '')
  })

  const outCount  = products.filter(p => (p.current_stock ?? 0) === 0).length
  const lowCount  = products.filter(p => (p.current_stock ?? 0) > 0 && (p.current_stock ?? 0) < 5).length
  const stockVal  = products.reduce((s, p) => s + (p.cost_price || 0) * (p.current_stock || 0), 0)
  const avgProfit = products.length > 0
    ? products.reduce((s, p) => s + (p.profit_on_discount || 0), 0) / products.length : 0

  return (
    <div className="space-y-5 slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/stocks"
          className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all text-sm flex-shrink-0">←</Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{stock.stock_name}</h1>
          <p className="text-gray-400 text-xs">{fmtDate(stock.date_added)}</p>
        </div>
        <button onClick={handleRecalc} disabled={recalcing}
          className="btn-secondary text-xs">{recalcing ? '⏳' : '🔄'} Recalc</button>
        <button onClick={exportCSV} className="btn-secondary text-xs">📥 CSV</button>
        <Link href={`/orders?stock_id=${id}`} className="btn-primary text-xs">🛒 Orders</Link>
      </div>

      {/* Stats — totalBuy always from live batches */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Net Purchase</p>
          <p className="font-bold text-gray-900 dark:text-white">{fmt(totalBuy)}</p>
          <p className="text-xs text-gray-400">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Expenses</p>
          <p className="font-bold text-yellow-600">{fmt(totalCosts)}</p>
          <p className="text-xs text-gray-400">{costs.length} items</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Total Cost to Me</p>
          <p className="font-bold text-red-500">{fmt(totalCostToYou)}</p>
          <p className="text-xs text-gray-400">purchase + expenses</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Cost Ratio</p>
          <p className="font-bold text-primary">{costRatioLive.toFixed(1)}%</p>
          <p className="text-xs text-gray-400">({fmt(totalCosts)} ÷ {fmt(totalBuy)}) × 100</p>
        </div>
      </div>

      {/* Stock health */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card text-center py-3 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-xs text-gray-400 mb-1">Products</p>
            <p className="font-bold text-blue-600">{products.length}</p>
          </div>
          <div className="card text-center py-3 bg-red-50 dark:bg-red-900/20">
            <p className="text-xs text-gray-400 mb-1">Out of Stock</p>
            <p className="font-bold text-red-600">{outCount}</p>
          </div>
          <div className="card text-center py-3 bg-yellow-50 dark:bg-yellow-900/20">
            <p className="text-xs text-gray-400 mb-1">Low Stock (&lt;5)</p>
            <p className="font-bold text-yellow-600">{lowCount}</p>
          </div>
          <div className="card text-center py-3 bg-green-50 dark:bg-green-900/20">
            <p className="text-xs text-gray-400 mb-1">Stock Value</p>
            <p className="font-bold text-green-600">{fmt(Math.round(stockVal))}</p>
          </div>
        </div>
      )}

      {/* Summary panel — single component, single totalBuy source */}
      {(batches.length > 0 || costs.length > 0) && (
        <StockSummaryPanel batches={batches} costs={costs} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
        {[['products', '🏷️ Products'], ['batches', '📦 Batches'], ['costs', '💰 Costs']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === k ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* PRODUCTS TAB */}
      {tab === 'products' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">
              {filtered.length} of {products.length} · Avg profit:&nbsp;
              <span className={avgProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                {fmtPct(avgProfit)}
              </span>
            </p>
            <button onClick={() => { setShowAdd(true); setEditing(null) }} className="btn-primary text-sm">+ Add Product</button>
          </div>

          {products.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="🔍 Search by code or name…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input w-auto text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="code">Code A-Z</option>
                  <option value="profit">Profit ↓</option>
                  <option value="stock">Low Stock First</option>
                  <option value="price">Buy Price ↑</option>
                </select>
              </div>
              <div className="flex gap-2 flex-wrap">
                {prodCats.map(c => (
                  <button key={c} onClick={() => setCatFilt(c)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${catFilt === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showAdd && !editing && (
            <ProductForm stockId={id} batches={batches} costMultiplier={costMultLive}
              onSave={onProductSave} onCancel={() => setShowAdd(false)} />
          )}

          {products.length === 0 && !showAdd && (
            <div className="card text-center py-10">
              <p className="text-3xl mb-2">🏷️</p>
              <p className="font-semibold text-gray-600 dark:text-gray-300">No products yet</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary mt-3 text-sm">+ Add First Product</button>
            </div>
          )}

          {filtered.map(p => (
            <div key={p._id}>
              {editing?._id === p._id ? (
                <ProductForm stockId={id} batches={batches} costMultiplier={costMultLive}
                  initial={p} onSave={onProductSave} onCancel={() => setEditing(null)} />
              ) : (
                <div className="card hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge-purple">{p.product_code}</span>
                        {p.category && <span className="badge-yellow">{p.category}</span>}
                        {(p.current_stock ?? 0) === 0 && (
                          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">OUT</span>
                        )}
                        {(p.current_stock ?? 0) > 0 && (p.current_stock ?? 0) < 5 && (
                          <span className="badge-red">⚠️ Low: {p.current_stock}</span>
                        )}
                      </div>
                      {p.product_name && (
                        <p className="font-semibold text-gray-800 dark:text-white mt-1 text-sm">{p.product_name}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => setQuickP(p)}
                        className="bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-green-200 transition-all">
                        📦 {p.current_stock ?? p.quantity_bought}
                      </button>
                      <button onClick={() => { setEditing(p); setShowAdd(false) }}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 text-sm">✏️</button>
                      <button onClick={() => deleteProduct(p)}
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
                      <p className="font-semibold text-red-500">{fmt(Math.round(p.cost_price || 0))}</p>
                      {costMultLive > 0 && (
                        <p className="text-xs text-gray-400">×{(1 + costMultLive).toFixed(3)}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Regular</p>
                      <p className="font-semibold">{fmt(p.regular_price)}</p>
                      <p className="text-xs text-green-600">+{fmtPct(p.profit_on_regular)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Discount</p>
                      <p className="font-semibold">{fmt(p.discount_price)}</p>
                      <p className={`text-xs ${(p.profit_on_discount || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmtPct(p.profit_on_discount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Qty Bought</p>
                      <p className="font-semibold">{p.quantity_bought}</p>
                      {(p.quantity_sold || 0) > 0 && (
                        <p className="text-xs text-orange-500">-{p.quantity_sold} sold</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">In Stock</p>
                      <p className={`font-bold ${(p.current_stock ?? 0) === 0 ? 'text-red-600' : (p.current_stock ?? 0) < 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {p.current_stock ?? 0} / {p.quantity_bought}
                      </p>
                    </div>
                  </div>
                  {p.notes && <p className="text-xs text-gray-400 mt-2 italic">📝 {p.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'batches' && (
        <BatchesTab stockId={id}
          onBatchesChange={newBatches => setBatches(newBatches)} />
      )}

      {tab === 'costs' && (
        <CostsTab stockId={id} costs={costs} setCosts={setCosts}
          onCostsChange={newCosts => setCosts(newCosts)} />
      )}

      {quickP && (
        <QuickModal product={quickP} onClose={() => setQuickP(null)}
          onSave={updated => setProducts(prev => prev.map(p => p._id === updated._id ? updated : p))} />
      )}
    </div>
  )
}
