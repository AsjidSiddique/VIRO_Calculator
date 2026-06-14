'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate, fmtPct, csvDownload } from '@/lib/format'
import { toast } from '@/components/Toast'

const PRODUCT_CATEGORIES = ['Jewellery','Bags','Cosmetics','Hair Accessories','Clothing','Shoes','Other']
const COST_CATEGORIES    = ['Rent','Travelling','Marketing/Ads','Packaging','Salary','Interest','COD Charges','Other']

/* ══ PURCHASE SUMMARY ═══════════════════════════════════════════════ */
function PurchaseSummary({ batches }) {
  const total         = batches.reduce((s,b) => s+(Number(b.buy_amount)||0), 0)
  const totalInterest = batches.reduce((s,b) => s+(Number(b.interest_amount)||0), 0)
  return (
    <div className="card bg-gradient-to-br from-violet-50 to-white dark:from-gray-800 dark:to-gray-900 border border-primary/20">
      <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm mb-3">📦 Net Purchase Summary</h3>
      <div className="space-y-1.5 text-sm">
        {batches.map(b => (
          <div key={b._id} className="flex items-center justify-between py-1">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span className="badge-yellow text-xs">{b.category||'Batch'}</span>
              {b.batch_name}
            </span>
            <div className="text-right">
              <span className="font-semibold">{fmt(b.buy_amount)}</span>
              {b.interest_amount > 0 && <span className="text-orange-500 text-xs ml-2">+{fmt(b.interest_amount)} int.</span>}
            </div>
          </div>
        ))}
        {batches.length > 1 && (
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-200 dark:border-gray-600 font-bold">
            <span className="text-gray-700 dark:text-gray-300">Total Purchase</span>
            <span className="text-primary">{fmt(total)}{totalInterest>0&&<span className="text-orange-400 text-xs ml-1">+{fmt(totalInterest)} int.</span>}</span>
          </div>
        )}
      </div>
      {batches.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Add purchase batches to see breakdown</p>}
    </div>
  )
}

/* ══ COST RATIO SUMMARY ══════════════════════════════════════════════ */
function CostSummary({ stock, costs }) {
  const totalBuy   = Number(stock.total_buy_amount)  || 0
  const totalCosts = costs.reduce((s,c) => s+(c.amount||0), 0)
  const ratio      = totalBuy > 0 ? (totalCosts / totalBuy) * 100 : 0
  return (
    <div className="card bg-gradient-to-br from-yellow-50 to-white dark:from-gray-800 dark:to-gray-900">
      <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm mb-3">💰 Cost Ratio Calculation</h3>
      <div className="space-y-1.5 text-sm">
        {costs.map(c => (
          <div key={c._id} className="flex items-center justify-between py-1">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <span>{c.category==='Rent'?'🏠':c.category==='Marketing/Ads'?'📢':c.category==='Packaging'?'📦':c.category==='Salary'?'👤':c.category==='Travelling'?'🚗':c.category==='Interest'?'💳':c.category==='COD Charges'?'🚚':'💰'}</span>
              {c.name}
              {c.parts?.length>0&&<span className="text-xs text-gray-400">({c.parts.map(p=>fmt(p.amount)).join('+')})</span>}
            </span>
            <span className="font-semibold">{fmt(c.amount)}</span>
          </div>
        ))}
        {costs.length > 0 && (
          <>
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500">
              <span>Total Costs</span><span className="font-bold text-yellow-600">{fmt(totalCosts)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Total Purchase</span><span className="font-bold">{fmt(totalBuy)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-xs text-gray-500">Cost Ratio = ({fmt(totalCosts)} ÷ {fmt(totalBuy)}) × 100</span>
              <span className="font-bold text-primary text-lg">{ratio.toFixed(1)}%</span>
            </div>
            <div className="bg-primary/5 rounded-lg px-3 py-2 text-xs text-gray-500">
              Every Rs.100 you buy → costs <b>Rs.{(100+ratio).toFixed(1)}</b> to you after expenses
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ══ QUICK STOCK MODAL ═══════════════════════════════════════════════ */
function QuickModal({ product, onClose, onSave }) {
  const [qty, setQty]   = useState('')
  const [type, setType] = useState('sold')
  const handle = async () => {
    const n = parseInt(qty)
    if (!n||n<=0) return toast.error('Enter a valid quantity')
    try {
      const updated = await api.patch(`/products/${product._id}`, { qty_change: type==='sold'?-n:n })
      onSave(updated); toast.success(type==='sold'?`✅ ${n} sold`:`📦 ${n} added`); onClose()
    } catch(e) { toast.error(e.message) }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-xs shadow-2xl slide-up">
        <h3 className="font-bold text-gray-800 dark:text-white mb-1">Quick Stock Update</h3>
        <p className="text-sm text-gray-500 mb-1">{product.product_code}{product.product_name?` · ${product.product_name}`:''}</p>
        <p className="text-xs text-gray-400 mb-3">Current: <b className="text-gray-700 dark:text-gray-200">{product.current_stock}</b></p>
        <div className="flex gap-2 mb-3">
          {['sold','add'].map(t=>(
            <button key={t} onClick={()=>setType(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${type===t?(t==='sold'?'bg-primary text-white':'bg-green-600 text-white'):'bg-gray-100 text-gray-600'}`}>
              {t==='sold'?'📤 Sold':'📥 Add'}
            </button>
          ))}
        </div>
        <input type="number" className="input mb-4" placeholder="Quantity" value={qty}
          onChange={e=>setQty(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&handle()} />
        <div className="flex gap-2">
          <button onClick={handle} className="btn-primary flex-1">Save</button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  )
}

/* ══ PRODUCT FORM ════════════════════════════════════════════════════ */
function ProductForm({ stockId, multiplier, batches, onSave, onCancel, initial }) {
  const blank = { product_code:'',product_name:'',category:'',buy_price:'',quantity_bought:'',
    regular_price:'',discount_price:'',notes:'',batch_id:'',
    expected_marketing_pct:'',expected_cod_return_pct:'',cod_charge_per_order:'' }
  const [form, setForm] = useState(initial ? {
    product_code:initial.product_code, product_name:initial.product_name||'',
    category:initial.category||'', buy_price:initial.buy_price,
    quantity_bought:initial.quantity_bought, regular_price:initial.regular_price||'',
    discount_price:initial.discount_price||'', notes:initial.notes||'',
    batch_id:initial.batch_id||'',
    expected_marketing_pct:initial.expected_marketing_pct||'',
    expected_cod_return_pct:initial.expected_cod_return_pct||'',
    cod_charge_per_order:initial.cod_charge_per_order||'',
  } : blank)
  const [saving,setSaving]=useState(false)
  const [hint,setHint]=useState(null)

  const buy  = parseFloat(form.buy_price)||0
  const mult = multiplier||0
  const cost = buy*(1+mult)
  const reg  = parseFloat(form.regular_price)||(cost>0?Math.round(cost*2):0)
  const disc = parseFloat(form.discount_price)||reg
  const pReg  = cost>0?((reg -cost)/cost)*100:0
  const pDisc = cost>0?((disc-cost)/cost)*100:0
  const p10   = cost>0?((disc*.9 -cost)/cost)*100:0
  const p15   = cost>0?((disc*.85-cost)/cost)*100:0
  const mktPct    = parseFloat(form.expected_marketing_pct)||0
  const codRetPct = parseFloat(form.expected_cod_return_pct)||0
  const codCharge = parseFloat(form.cod_charge_per_order)||0
  const effectiveCost   = cost + disc*(mktPct/100) + disc*(codRetPct/100) + codCharge
  const effectiveProfit = disc - effectiveCost
  const effectivePct    = effectiveCost>0?(effectiveProfit/effectiveCost)*100:0

  const f = (field,val) => setForm(p=>({...p,[field]:val}))

  const searchCode = async code => {
    if (code.length<2) return setHint(null)
    try {
      const d = await api.get(`/products?byCode=${code}`)
      if(d){setHint(d);setForm(p=>({...p,product_name:d.product_name||p.product_name,category:d.category||p.category}))}
      else setHint(null)
    } catch{setHint(null)}
  }

  const handleSubmit = async () => {
    if (!form.product_code||!form.buy_price||!form.quantity_bought) return toast.error('Code, buy price & qty required')
    setSaving(true)
    try {
      const data = initial?._id
        ? await api.put(`/products/${initial._id}`,{...form,stock_id:stockId})
        : await api.post('/products',{...form,stock_id:stockId})
      onSave(data); toast.success(initial?'Product updated!':'Product added!')
    } catch(e){toast.error(e.message)}
    finally{setSaving(false)}
  }

  return (
    <div className="card border-2 border-primary/20 slide-up space-y-4">
      <h3 className="font-bold text-gray-800 dark:text-white">{initial?'✏️ Edit Product':'➕ Add Product'}</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="label">Code *</label>
          <input className="input uppercase" placeholder="LIP01" value={form.product_code}
            onChange={e=>{f('product_code',e.target.value.toUpperCase());searchCode(e.target.value)}} />
          {hint&&<p className="text-xs text-primary mt-1">↑ {hint.product_name}</p>}
        </div>
        <div><label className="label">Name</label>
          <input className="input" placeholder="Product name" value={form.product_name} onChange={e=>f('product_name',e.target.value)} /></div>
        <div><label className="label">Category</label>
          <input className="input" placeholder="Jewellery…" value={form.category} list="pcat" onChange={e=>f('category',e.target.value)} />
          <datalist id="pcat">{PRODUCT_CATEGORIES.map(c=><option key={c} value={c}/>)}</datalist>
        </div>
        <div><label className="label">Buy Price *</label>
          <input type="number" className="input" placeholder="500" value={form.buy_price} onChange={e=>f('buy_price',e.target.value)} /></div>
        <div><label className="label">Quantity *</label>
          <input type="number" className="input" placeholder="10" value={form.quantity_bought} onChange={e=>f('quantity_bought',e.target.value)} /></div>
        {batches.length>0&&(
          <div><label className="label">Purchase Batch</label>
            <select className="input" value={form.batch_id} onChange={e=>f('batch_id',e.target.value)}>
              <option value="">— None —</option>
              {batches.map(b=><option key={b._id} value={b._id}>{b.batch_name} ({fmt(b.buy_amount)})</option>)}
            </select>
          </div>
        )}
        <div><label className="label">Regular Price</label>
          <input type="number" className="input" placeholder={Math.round(cost*2)||''} value={form.regular_price} onChange={e=>f('regular_price',e.target.value)} /></div>
        <div><label className="label">Discount / Min Price</label>
          <input type="number" className="input" placeholder={Math.round(reg*.85)||''} value={form.discount_price} onChange={e=>f('discount_price',e.target.value)} /></div>
        <div><label className="label">Notes</label>
          <input className="input" placeholder="Any notes…" value={form.notes} onChange={e=>f('notes',e.target.value)} /></div>
      </div>

      {/* Expected expenses */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">📊 Expected Expenses (for real profit)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><label className="label">Marketing % of sell price</label>
            <div className="relative"><input type="number" className="input pr-7" placeholder="10" value={form.expected_marketing_pct} onChange={e=>f('expected_marketing_pct',e.target.value)} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span></div></div>
          <div><label className="label">COD Return Rate %</label>
            <div className="relative"><input type="number" className="input pr-7" placeholder="15" value={form.expected_cod_return_pct} onChange={e=>f('expected_cod_return_pct',e.target.value)} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span></div></div>
          <div><label className="label">COD Charge/order (PKR)</label>
            <input type="number" className="input" placeholder="150" value={form.cod_charge_per_order} onChange={e=>f('cod_charge_per_order',e.target.value)} /></div>
        </div>
      </div>

      {/* Live calc */}
      {buy>0&&(
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3 text-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">📊 Live Calculation</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400">Buy Price</p><p className="font-bold">{fmt(buy)}</p></div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400">Cost to Me</p>
              <p className="font-bold text-red-500">{fmt(Math.round(cost))}</p>
              <p className="text-xs text-gray-400">×{(1+mult).toFixed(3)} ({(mult*100).toFixed(1)}% exp.)</p></div>
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400">Regular → Profit</p>
              <p className="font-bold text-primary">{fmt(Math.round(reg))}</p>
              <p className={`text-xs font-semibold ${pReg>=0?'text-green-600':'text-red-500'}`}>+{fmtPct(pReg)}</p></div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400">Discount → Profit</p>
              <p className="font-bold text-green-700">{fmt(Math.round(disc))}</p>
              <p className={`text-xs font-semibold ${pDisc>=0?'text-green-600':'text-red-500'}`}>{fmtPct(pDisc)}</p></div>
          </div>
          <div className="flex gap-3 flex-wrap text-xs">
            <span className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">Eid -10%: <b>{fmt(Math.round(disc*.9))}</b> → <span className={p10>=0?'text-green-600':'text-red-500'}>{fmtPct(p10)}</span></span>
            <span className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">Sale -15%: <b>{fmt(Math.round(disc*.85))}</b> → <span className={p15>=0?'text-green-600':'text-red-500'}>{fmtPct(p15)}</span></span>
            <span className="text-gray-400">Total buy: <b>{fmt(Math.round(buy*(parseFloat(form.quantity_bought)||1)))}</b></span>
          </div>
          {(mktPct>0||codRetPct>0||codCharge>0)&&(
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 space-y-1 text-xs">
              <p className="font-bold text-orange-700 dark:text-orange-400">📊 Effective Cost (after all deductions)</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
                <span>Stock cost: <b>{fmt(Math.round(cost))}</b></span>
                {mktPct>0&&<span>Marketing {mktPct}%: <b>+{fmt(Math.round(disc*(mktPct/100)))}</b></span>}
                {codRetPct>0&&<span>Returns {codRetPct}%: <b>+{fmt(Math.round(disc*(codRetPct/100)))}</b></span>}
                {codCharge>0&&<span>COD fee: <b>+{fmt(codCharge)}</b></span>}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-orange-200">
                <span className="font-bold text-orange-700 dark:text-orange-400">Real profit at {fmt(disc)}</span>
                <span className={`font-bold text-base ${effectiveProfit>=0?'text-green-600':'text-red-600'}`}>
                  {fmt(Math.round(effectiveProfit))} ({fmtPct(effectivePct)})
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">{saving?'Saving…':initial?'✅ Update':'✅ Add Product'}</button>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  )
}

/* ══ BATCHES TAB ════════════════════════════════════════════════════ */
function BatchesTab({ stockId, onRefresh }) {
  const [batches,setBatches]=useState([])
  const [loading,setLoading]=useState(true)
  const [showAdd,setShowAdd]=useState(false)
  const [editing,setEditing]=useState(null)
  const [saving,setSaving]=useState(false)
  const empty={batch_name:'',category:'',date_purchased:new Date().toISOString().slice(0,10),buy_amount:'',interest_rate:'0',notes:''}
  const [form,setForm]=useState(empty)

  const load=useCallback(async()=>{
    setLoading(true)
    try{setBatches(await api.get(`/batches?stock_id=${stockId}`))}
    finally{setLoading(false)}
  },[stockId])

  useEffect(()=>{load()},[load])

  const buy  = parseFloat(form.buy_amount)||0
  const rate = parseFloat(form.interest_rate)||0
  const intAmt = (buy*rate)/100

  const handleSave=async()=>{
    if (!form.batch_name||!form.buy_amount) return toast.error('Batch name and buy amount required')
    setSaving(true)
    try{
      if (editing){
        const b=await api.put(`/batches/${editing}`,{...form,stock_id:stockId})
        setBatches(prev=>prev.map(x=>x._id===editing?b:x))
        toast.success('Batch updated!')
      } else {
        const b=await api.post('/batches',{...form,stock_id:stockId})
        setBatches(prev=>[b,...prev])
        toast.success('Batch added!')
      }
      setForm(empty);setShowAdd(false);setEditing(null);onRefresh()
    } catch(e){toast.error(e.message)}
    finally{setSaving(false)}
  }
  const handleEdit=b=>{
    setForm({batch_name:b.batch_name,category:b.category||'',date_purchased:new Date(b.date_purchased).toISOString().slice(0,10),buy_amount:b.buy_amount,interest_rate:b.interest_rate||'0',notes:b.notes||''})
    setEditing(b._id);setShowAdd(true)
  }
  const handleDelete=async id=>{
    if(!confirm('Delete this batch?'))return
    await api.delete(`/batches/${id}`)
    setBatches(prev=>prev.filter(b=>b._id!==id))
    toast.success('Deleted');onRefresh()
  }

  const totalBuy=batches.reduce((s,b)=>s+(Number(b.buy_amount)||0),0)
  const totalInt=batches.reduce((s,b)=>s+(Number(b.interest_amount)||0),0)

  if(loading) return <div className="skeleton h-24"/>
  return (
    <div className="space-y-3">
      {batches.length>0&&(
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center py-3"><p className="text-xs text-gray-400 mb-1">Total Purchases</p><p className="font-bold text-primary">{fmt(totalBuy)}</p></div>
          <div className="card text-center py-3"><p className="text-xs text-gray-400 mb-1">Total Interest</p><p className="font-bold text-orange-500">{fmt(totalInt)}</p></div>
          <div className="card text-center py-3"><p className="text-xs text-gray-400 mb-1">Grand Total</p><p className="font-bold text-red-500">{fmt(totalBuy+totalInt)}</p></div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{batches.length} purchase batches</p>
        <button onClick={()=>{setShowAdd(true);setEditing(null);setForm(empty)}} className="btn-primary text-sm">+ Add Batch</button>
      </div>

      {showAdd&&(
        <div className="card border-2 border-primary/20 slide-up">
          <h3 className="font-bold text-gray-800 dark:text-white mb-3">{editing?'✏️ Edit Batch':'📦 New Purchase Batch'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="label">Batch Name *</label>
              <input className="input" placeholder="Bags, Jewellery…" value={form.batch_name}
                onChange={e=>setForm(f=>({...f,batch_name:e.target.value}))} autoFocus /></div>
            <div><label className="label">Category</label>
              <input className="input" placeholder="Bags" value={form.category} list="bcat"
                onChange={e=>setForm(f=>({...f,category:e.target.value}))} />
              <datalist id="bcat">{PRODUCT_CATEGORIES.map(c=><option key={c} value={c}/>)}</datalist></div>
            <div><label className="label">Date Purchased</label>
              <input type="date" className="input" value={form.date_purchased}
                onChange={e=>setForm(f=>({...f,date_purchased:e.target.value}))} /></div>
            <div><label className="label">Buy Amount (PKR) *</label>
              <input type="number" className="input" placeholder="41000" value={form.buy_amount}
                onChange={e=>setForm(f=>({...f,buy_amount:e.target.value}))} /></div>
            <div><label className="label">Interest Rate % (credit)</label>
              <div className="relative"><input type="number" className="input pr-7" placeholder="0" value={form.interest_rate}
                onChange={e=>setForm(f=>({...f,interest_rate:e.target.value}))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span></div></div>
            <div><label className="label">Notes</label>
              <input className="input" placeholder="Supplier…" value={form.notes}
                onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          </div>
          {buy>0&&(
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm flex flex-wrap gap-x-5 gap-y-1">
              <span>Buy: <b>{fmt(buy)}</b></span>
              {rate>0&&<span className="text-orange-500">Interest {rate}%: <b>+{fmt(Math.round(intAmt))}</b></span>}
              <span className="font-bold text-primary">Total: {fmt(Math.round(buy+intAmt))}</span>
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving?'Saving…':editing?'✅ Update':'✅ Add Batch'}</button>
            <button onClick={()=>{setShowAdd(false);setEditing(null);setForm(empty)}} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {batches.length===0&&!showAdd&&(
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">📦</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300">No batches yet</p>
          <p className="text-xs text-gray-400 mt-1">e.g. Bags Rs.40,500 + Cosmetics Rs.11,000 + Jewellery Rs.55,000</p>
          <button onClick={()=>setShowAdd(true)} className="btn-primary mt-3 text-sm">+ Add First Batch</button>
        </div>
      )}

      {batches.map(b=>(
        <div key={b._id} className="card hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📦</div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-800 dark:text-white">{b.batch_name}</p>
                  {b.category&&<span className="badge-yellow text-xs">{b.category}</span>}
                </div>
                <p className="text-xs text-gray-400">{fmtDate(b.date_purchased)}{b.notes?` · ${b.notes}`:''}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={()=>handleEdit(b)} className="bg-gray-100 dark:bg-gray-700 text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-all text-sm">✏️</button>
              <button onClick={()=>handleDelete(b._id)} className="text-red-400 hover:text-red-600 p-1.5 text-sm">🗑️</button>
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-center text-sm">
            <div><p className="text-xs text-gray-400">Buy Amount</p><p className="font-bold">{fmt(b.buy_amount)}</p></div>
            <div><p className="text-xs text-gray-400">Interest ({b.interest_rate}%)</p><p className="font-bold text-orange-500">{fmt(b.interest_amount||0)}</p></div>
            <div><p className="text-xs text-gray-400">Total</p><p className="font-bold text-red-500">{fmt((b.buy_amount||0)+(b.interest_amount||0))}</p></div>
            <div className="hidden md:block"><p className="text-xs text-gray-400">Type</p><p>{(b.interest_rate||0)>0?'💳 Credit':'💵 Cash'}</p></div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══ COSTS TAB ══════════════════════════════════════════════════════ */
function CostsTab({ stockId, costs, setCosts, onRefresh }) {
  const [showAdd,setShowAdd]=useState(false)
  const [editing,setEditing]=useState(null)
  const empty={name:'',amount:'',category:'Other',type:'fixed',parts:[]}
  const [form,setForm]=useState(empty)
  const [parts,setParts]=useState([])
  const totalCosts=costs.reduce((s,c)=>s+c.amount,0)
  const partsSum=parts.reduce((s,p)=>s+(parseFloat(p.amount)||0),0)

  const handleSave=async()=>{
    if (!form.name) return toast.error('Name required')
    const finalAmount=parts.length>0?partsSum:(parseFloat(form.amount)||0)
    if (!finalAmount) return toast.error('Amount required')
    try{
      const payload={...form,amount:finalAmount,parts:parts.filter(p=>p.amount),stock_id:stockId}
      if(editing){
        const c=await api.put(`/costs/${editing}`,payload)
        setCosts(prev=>prev.map(x=>x._id===editing?c:x))
        toast.success('Cost updated!')
      } else {
        const c=await api.post('/costs',payload)
        setCosts(prev=>[...prev,c])
        toast.success('Cost added!')
      }
      setForm(empty);setParts([]);setShowAdd(false);setEditing(null);onRefresh()
    }catch(e){toast.error(e.message)}
  }
  const handleEdit=c=>{
    setForm({name:c.name,amount:c.amount,category:c.category,type:c.type,parts:[]})
    setParts(c.parts?.length>0?c.parts.map(p=>({label:p.label||'',amount:p.amount})):[])
    setEditing(c._id);setShowAdd(true)
  }
  const handleDelete=async id=>{
    await api.delete(`/costs/${id}`)
    setCosts(prev=>prev.filter(c=>c._id!==id))
    onRefresh();toast.success('Removed')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{costs.length} costs · Total: <b>{fmt(totalCosts)}</b></p>
        <button onClick={()=>{setShowAdd(true);setEditing(null);setForm(empty);setParts([])}} className="btn-primary text-sm">+ Add Cost</button>
      </div>
      {showAdd&&(
        <div className="card border-2 border-primary/20 slide-up space-y-3">
          <h3 className="font-bold text-gray-800 dark:text-white">{editing?'✏️ Edit Cost':'💰 Add Cost'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="label">Category</label>
              <select className="input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value,name:f.name||e.target.value}))}>
                {COST_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label className="label">Label *</label>
              <input className="input" placeholder="June Rent" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
            <div><label className="label">Type</label>
              <select className="input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                <option value="fixed">Fixed</option><option value="per_unit">Per Unit</option></select></div>
            {parts.length===0&&(
              <div><label className="label">Amount (PKR)</label>
                <input type="number" className="input" placeholder="5000" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">💡 Breakdown (e.g. Rent = 350+2500+200)</p>
              <button onClick={()=>setParts(p=>[...p,{label:'',amount:''}])} className="text-primary text-xs font-semibold hover:underline">+ Add Part</button>
            </div>
            {parts.map((p,i)=>(
              <div key={i} className="flex gap-2 mb-2">
                <input className="input text-sm flex-1" placeholder="Label" value={p.label} onChange={e=>setParts(p=>{const a=[...p];a[i]={...a[i],label:e.target.value};return a})} />
                <input type="number" className="input text-sm w-32" placeholder="Amount" value={p.amount} onChange={e=>setParts(p=>{const a=[...p];a[i]={...a[i],amount:e.target.value};return a})} />
                <button onClick={()=>setParts(p=>p.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 px-2 text-sm">✕</button>
              </div>
            ))}
            {parts.length>0&&(
              <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                <span className="text-gray-500">Sum:</span>
                <span className="font-bold text-yellow-700">{fmt(partsSum)}</span>
                <span className="text-xs text-gray-400">({parts.filter(p=>p.amount).map(p=>fmt(p.amount)).join(' + ')})</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="btn-primary">{editing?'✅ Update':'✅ Add Cost'}</button>
            <button onClick={()=>{setShowAdd(false);setEditing(null);setForm(empty);setParts([])}} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
      {costs.length===0&&!showAdd&&(
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">💰</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300">No costs yet</p>
          <button onClick={()=>setShowAdd(true)} className="btn-primary mt-3 text-sm">+ Add Cost</button>
        </div>
      )}
      {costs.map(c=>(
        <div key={c._id} className="card flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <span className="w-9 h-9 bg-yellow-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
              {c.category==='Rent'?'🏠':c.category==='Marketing/Ads'?'📢':c.category==='Packaging'?'📦':c.category==='Salary'?'👤':c.category==='Travelling'?'🚗':c.category==='Interest'?'💳':c.category==='COD Charges'?'🚚':'💰'}
            </span>
            <div>
              <p className="font-semibold text-sm text-gray-800 dark:text-white">{c.name}</p>
              <p className="text-xs text-gray-400">{c.category} · {c.type}</p>
              {c.parts?.length>0&&<p className="text-xs text-gray-400 mt-0.5">{c.parts.map(p=>`${p.label?p.label+': ':''}${fmt(p.amount)}`).join(' + ')} = {fmt(c.amount)}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <p className="font-bold text-gray-800 dark:text-white">{fmt(c.amount)}</p>
            <button onClick={()=>handleEdit(c)} className="bg-gray-100 dark:bg-gray-700 text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-all text-sm">✏️</button>
            <button onClick={()=>handleDelete(c._id)} className="text-red-400 hover:text-red-600 p-1 text-sm">🗑️</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══ MAIN PAGE ═══════════════════════════════════════════════════════ */
export default function StockDetail() {
  const {id}=useParams()
  const [stock,setStock]=useState(null)
  const [products,setProducts]=useState([])
  const [costs,setCosts]=useState([])
  const [batches,setBatches]=useState([])
  const [loading,setLoading]=useState(true)
  const [tab,setTab]=useState('products')
  const [showAdd,setShowAdd]=useState(false)
  const [editing,setEditing]=useState(null)
  const [quickP,setQuickP]=useState(null)
  const [search,setSearch]=useState('')
  const [catFilt,setCatFilt]=useState('All')
  const [recalcing,setRecalcing]=useState(false)

  // NEW FEATURE 1: Sort products
  const [sortBy,setSortBy]=useState('code') // code | profit | stock | price

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const [stks,prds,csts,bats]=await Promise.all([
        api.get('/stocks'),
        api.get(`/products?stock_id=${id}`),
        api.get(`/costs?stock_id=${id}`),
        api.get(`/batches?stock_id=${id}`),
      ])
      setStock(stks.find(s=>s._id===id))
      setProducts(prds);setCosts(csts);setBatches(bats)
    } finally{setLoading(false)}
  },[id])

  useEffect(()=>{load()},[load])

  // NEW FEATURE 2: Force recalc with one click
  const handleRecalc=async()=>{
    setRecalcing(true)
    try{
      const s=await api.patch(`/stocks/${id}`,{})
      setStock(s);load()
      toast.success(`✅ Recalculated! Cost ratio: ${((s.cost_multiplier||0)*100).toFixed(1)}%`)
    } catch(e){toast.error(e.message)}
    finally{setRecalcing(false)}
  }

  const onProductSave=p=>{
    setProducts(prev=>{
      const idx=prev.findIndex(x=>x._id===p._id)
      if(idx>=0){const a=[...prev];a[idx]=p;return a}
      return [p,...prev]
    })
    setShowAdd(false);setEditing(null);load()
  }

  const deleteProduct=async p=>{
    if(!confirm(`Delete ${p.product_code}?`))return
    await api.delete(`/products/${p._id}`)
    setProducts(prev=>prev.filter(x=>x._id!==p._id))
    load();toast.success('Deleted')
  }

  const exportCSV=()=>{
    if(!products.length) return toast.error('No products to export')
    csvDownload(products.map(p=>({
      Code:p.product_code, Name:p.product_name||'', Category:p.category||'',
      'Buy Price':p.buy_price, Qty:p.quantity_bought, 'Total Buy':p.total_buy,
      'Cost Price':Math.round(p.cost_price||0), 'Regular':p.regular_price,
      'Discount':p.discount_price, 'Profit% Reg':p.profit_on_regular?.toFixed(1),
      'Profit% Disc':p.profit_on_discount?.toFixed(1),
      'Effective Cost':Math.round(p.effective_cost_price||0),
      'Stock Left':p.current_stock,
    })),`${stock?.stock_name||'stock'}-products.csv`)
    toast.success('CSV exported!')
  }

  if(loading) return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-20"/>)}</div>
  if(!stock) return <div className="card text-center py-10"><p className="text-gray-400">Stock not found</p><Link href="/stocks" className="btn-primary mt-4 inline-block">← Back</Link></div>

  const totalCosts=costs.reduce((s,c)=>s+c.amount,0)

  // Filter + sort products
  const prodCats=['All',...new Set(products.map(p=>p.category).filter(Boolean))]
  let filteredProds=products.filter(p=>{
    const ms=!search||p.product_code?.toLowerCase().includes(search.toLowerCase())||p.product_name?.toLowerCase().includes(search.toLowerCase())
    const mc=catFilt==='All'||p.category?.toLowerCase()===catFilt.toLowerCase()
    return ms&&mc
  })
  // Sort
  filteredProds=[...filteredProds].sort((a,b)=>{
    if(sortBy==='profit')  return (b.profit_on_discount||0)-(a.profit_on_discount||0)
    if(sortBy==='stock')   return (a.current_stock||0)-(b.current_stock||0)  // low stock first
    if(sortBy==='price')   return (a.buy_price||0)-(b.buy_price||0)
    return (a.product_code||'').localeCompare(b.product_code||'')
  })

  // NEW FEATURE 3: Stock health stats
  const lowStockCount  = products.filter(p=>(p.current_stock||0)<5&&(p.current_stock||0)>0).length
  const outOfStock     = products.filter(p=>(p.current_stock||0)===0).length
  const totalStockVal  = products.reduce((s,p)=>s+(p.cost_price||0)*(p.current_stock||0),0)
  const avgProfitDisc  = products.length>0?products.reduce((s,p)=>s+(p.profit_on_discount||0),0)/products.length:0

  return (
    <div className="space-y-5 slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/stocks" className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all text-sm">←</Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{stock.stock_name}</h1>
          <p className="text-gray-400 text-xs">{fmtDate(stock.date_added)}</p>
        </div>
        <button onClick={handleRecalc} disabled={recalcing}
          className={`btn-secondary text-xs ${recalcing?'opacity-60':''}`}>
          {recalcing?'⏳':'🔄'} Recalc
        </button>
        <button onClick={exportCSV} className="btn-secondary text-xs">📥 CSV</button>
        <Link href={`/orders?stock_id=${id}`} className="btn-primary text-xs">🛒 Orders</Link>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Net Purchase</p>
          <p className="font-bold text-gray-900 dark:text-white">{fmt(stock.total_buy_amount)}</p>
          <p className="text-xs text-gray-400">{batches.length} batch{batches.length!==1?'es':''}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Expenses</p>
          <p className="font-bold text-yellow-600">{fmt(totalCosts)}</p>
          <p className="text-xs text-gray-400">{costs.length} cost items</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Total Cost to Me</p>
          <p className="font-bold text-red-500">{fmt(stock.total_cost_amount)}</p>
          <p className="text-xs text-gray-400">purchase + expenses</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Cost Ratio</p>
          <p className="font-bold text-primary">{((stock.cost_multiplier||0)*100).toFixed(1)}%</p>
          <p className="text-xs text-gray-400">({fmt(totalCosts)} ÷ {fmt(stock.total_buy_amount)}) × 100</p>
        </div>
      </div>

      {/* NEW FEATURE 4: Stock health bar */}
      {products.length>0&&(
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card text-center py-3 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-xs text-gray-400 mb-1">Products</p>
            <p className="font-bold text-blue-600">{products.length}</p>
          </div>
          <div className="card text-center py-3 bg-red-50 dark:bg-red-900/20">
            <p className="text-xs text-gray-400 mb-1">Out of Stock</p>
            <p className="font-bold text-red-600">{outOfStock}</p>
          </div>
          <div className="card text-center py-3 bg-yellow-50 dark:bg-yellow-900/20">
            <p className="text-xs text-gray-400 mb-1">Low Stock (&lt;5)</p>
            <p className="font-bold text-yellow-600">{lowStockCount}</p>
          </div>
          <div className="card text-center py-3 bg-green-50 dark:bg-green-900/20">
            <p className="text-xs text-gray-400 mb-1">Stock Value</p>
            <p className="font-bold text-green-600">{fmt(Math.round(totalStockVal))}</p>
            <p className="text-xs text-gray-400">at cost price</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {(batches.length>0||costs.length>0)&&(
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {batches.length>0&&<PurchaseSummary batches={batches}/>}
          {costs.length>0&&<CostSummary stock={stock} costs={costs}/>}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 overflow-x-auto">
        {[['products','🏷️ Products'],['batches','📦 Batches'],['costs','💰 Costs']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap px-3 ${tab===k?'bg-white dark:bg-gray-800 text-primary shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Products tab */}
      {tab==='products'&&(
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">{filteredProds.length} of {products.length} products · Avg profit: <span className={avgProfitDisc>=0?'text-green-600 font-semibold':'text-red-500 font-semibold'}>{fmtPct(avgProfitDisc)}</span></p>
            <button onClick={()=>{setShowAdd(true);setEditing(null)}} className="btn-primary text-sm">+ Add Product</button>
          </div>

          {/* Search + filter + sort */}
          {products.length>0&&(
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="🔍 Search by code or name…" value={search}
                  onChange={e=>setSearch(e.target.value)} />
                {/* NEW FEATURE 5: Sort dropdown */}
                <select className="input w-auto text-sm" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                  <option value="code">Sort: Code</option>
                  <option value="profit">Sort: Profit ↓</option>
                  <option value="stock">Sort: Low Stock First</option>
                  <option value="price">Sort: Buy Price ↑</option>
                </select>
              </div>
              <div className="flex gap-2 flex-wrap">
                {prodCats.map(c=>(
                  <button key={c} onClick={()=>setCatFilt(c)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${catFilt===c?'bg-primary text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showAdd&&!editing&&(
            <ProductForm stockId={id} multiplier={stock.cost_multiplier} batches={batches}
              onSave={onProductSave} onCancel={()=>setShowAdd(false)} />
          )}
          {products.length===0&&!showAdd&&(
            <div className="card text-center py-10">
              <p className="text-3xl mb-2">🏷️</p>
              <p className="font-semibold text-gray-600 dark:text-gray-300">No products yet</p>
              <button onClick={()=>setShowAdd(true)} className="btn-primary mt-3 text-sm">+ Add First Product</button>
            </div>
          )}

          {filteredProds.map(p=>(
            <div key={p._id}>
              {editing?._id===p._id?(
                <ProductForm stockId={id} multiplier={stock.cost_multiplier} batches={batches}
                  initial={p} onSave={onProductSave} onCancel={()=>setEditing(null)} />
              ):(
                <div className="card hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge-purple">{p.product_code}</span>
                        {p.category&&<span className="badge-yellow">{p.category}</span>}
                        {(p.current_stock??0)===0&&<span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">OUT</span>}
                        {(p.current_stock??0)>0&&(p.current_stock??0)<5&&<span className="badge-red">⚠️ Low: {p.current_stock}</span>}
                      </div>
                      {p.product_name&&<p className="font-semibold text-gray-800 dark:text-white mt-1 text-sm">{p.product_name}</p>}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={()=>setQuickP(p)}
                        className="bg-green-100 text-green-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-200 transition-all">
                        📦 {p.current_stock??p.quantity_bought}
                      </button>
                      <button onClick={()=>{setEditing(p);setShowAdd(false)}}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-all text-sm">✏️</button>
                      <button onClick={()=>deleteProduct(p)}
                        className="bg-red-50 text-red-500 p-1.5 rounded-lg hover:bg-red-100 transition-all text-sm">🗑️</button>
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
                      {stock.cost_multiplier>0&&<p className="text-xs text-gray-400">×{(1+(stock.cost_multiplier||0)).toFixed(3)}</p>}
                    </div>
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
                    {p.effective_cost_price&&p.effective_cost_price>(p.cost_price||0)+1?(
                      <div>
                        <p className="text-xs text-gray-400">Eff. Cost</p>
                        <p className="font-semibold text-orange-500">{fmt(Math.round(p.effective_cost_price))}</p>
                        <p className="text-xs text-gray-400">incl. mkt+cod</p>
                      </div>
                    ):(
                      <div>
                        <p className="text-xs text-gray-400">Qty Bought</p>
                        <p className="font-semibold">{p.quantity_bought}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-400">In Stock</p>
                      <p className={`font-bold ${(p.current_stock??0)===0?'text-red-600':(p.current_stock??0)<5?'text-yellow-600':'text-green-600'}`}>
                        {p.current_stock??0} / {p.quantity_bought}
                      </p>
                    </div>
                  </div>
                  {p.notes&&<p className="text-xs text-gray-400 mt-2 italic">📝 {p.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab==='batches'&&<BatchesTab stockId={id} onRefresh={load}/>}
      {tab==='costs'&&<CostsTab stockId={id} costs={costs} setCosts={setCosts} onRefresh={load}/>}

      {quickP&&<QuickModal product={quickP} onClose={()=>setQuickP(null)}
        onSave={updated=>setProducts(prev=>prev.map(p=>p._id===updated._id?updated:p))}/>}
    </div>
  )
}
