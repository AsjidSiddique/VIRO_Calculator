'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate, csvDownload } from '@/lib/format'
import { toast } from '@/components/Toast'

const STATUSES   = ['all','pending','confirmed','processing','shipped','delivered','returned','cancelled']
const STATUS_COLOR = {
  pending:    'bg-yellow-100 text-yellow-700',
  confirmed:  'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  returned:   'bg-red-100 text-red-700',
  cancelled:  'bg-gray-100 text-gray-500',
}
const STATUS_ICON = { pending:'⏳', confirmed:'✅', processing:'⚙️', shipped:'🚚', delivered:'📬', returned:'↩️', cancelled:'❌' }
const PAYMENT_METHODS = ['COD','JazzCash','EasyPaisa','Cash','Bank','Other']

/* ══════════════════════════════════════════════════════
   NEW ORDER FORM
══════════════════════════════════════════════════════ */
function NewOrderForm({ products, stocks, onSave, onCancel }) {
  const [form, setForm] = useState({
    customer_name:'', customer_phone:'',
    date: new Date().toISOString().slice(0,10),
    stock_id:'', payment_method:'COD', status:'pending',
    items:[], order_discount:'', discount_pct:'', notes:'',
  })
  const [saving, setSaving] = useState(false)

  const addItem = () => setForm(f=>({
    ...f, items:[...f.items,{ product_id:'',product_code:'',product_name:'',qty:1,unit_price:'',cost_price:0,discount:0 }]
  }))

  const updateItem = (i, field, val) => setForm(f=>{
    const items=[...f.items]
    items[i]={...items[i],[field]:val}
    if(field==='product_id'){
      const p=products.find(x=>x._id===val)
      if(p){ items[i].product_code=p.product_code; items[i].product_name=p.product_name||''; items[i].cost_price=p.cost_price||0; if(!items[i].unit_price) items[i].unit_price=p.discount_price||p.regular_price||0 }
    }
    return {...f,items}
  })

  const removeItem = i => setForm(f=>({...f,items:f.items.filter((_,j)=>j!==i)}))

  const subtotal = form.items.reduce((s,i)=>{
    const line=(parseFloat(i.unit_price)||0)*(parseInt(i.qty)||1)
    return s+line*(1-(parseFloat(i.discount)||0)/100)
  },0)
  const orderDisc = form.order_discount ? parseFloat(form.order_discount)||0 : subtotal*((parseFloat(form.discount_pct)||0)/100)
  const total = Math.max(0, subtotal - orderDisc)
  const totalCost = form.items.reduce((s,i)=>(parseFloat(i.cost_price)||0)*(parseInt(i.qty)||1)+s,0)
  const totalProfit = total - totalCost

  const handleSave = async () => {
    if (!form.customer_name.trim()) return toast.error('Customer name required')
    if (form.items.length===0) return toast.error('Add at least one item')
    setSaving(true)
    try {
      const order = await api.post('/orders', form)
      onSave(order)
      toast.success(`Order ${order.order_number} created!`)
    } catch(e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="card border-2 border-primary/20 space-y-4 slide-up">
      <h3 className="font-bold text-gray-800 dark:text-white text-lg">🛒 New Order</h3>

      {/* Customer info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="label">Customer Name *</label>
          <input className="input" placeholder="Ali Hassan" value={form.customer_name}
            onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))} autoFocus />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" placeholder="03xx-xxxxxxx" value={form.customer_phone}
            onChange={e=>setForm(f=>({...f,customer_phone:e.target.value}))} />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={form.date}
            onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
        </div>
        <div>
          <label className="label">Payment</label>
          <select className="input" value={form.payment_method}
            onChange={e=>setForm(f=>({...f,payment_method:e.target.value}))}>
            {PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status}
            onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
            {STATUSES.filter(s=>s!=='all').map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Linked Stock</label>
          <select className="input" value={form.stock_id}
            onChange={e=>setForm(f=>({...f,stock_id:e.target.value}))}>
            <option value="">— None —</option>
            {stocks.map(s=><option key={s._id} value={s._id}>{s.stock_name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Notes</label>
          <input className="input" placeholder="Address, special instructions…" value={form.notes}
            onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">🏷️ Order Items</p>
          <button onClick={addItem} className="text-primary text-sm font-semibold hover:underline">+ Add Item</button>
        </div>

        {form.items.length === 0 && (
          <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-gray-400 text-sm">
            No items yet — click "+ Add Item"
          </div>
        )}

        <div className="space-y-2">
          {form.items.map((item,i)=>{
            const line=(parseFloat(item.unit_price)||0)*(parseInt(item.qty)||1)
            const sub=line*(1-(parseFloat(item.discount)||0)/100)
            const profit=sub-(parseFloat(item.cost_price)||0)*(parseInt(item.qty)||1)
            return (
              <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  <div className="col-span-2 md:col-span-2">
                    <select className="input text-sm" value={item.product_id} onChange={e=>updateItem(i,'product_id',e.target.value)}>
                      <option value="">Select product…</option>
                      {products.map(p=><option key={p._id} value={p._id}>{p.product_code}{p.product_name?` · ${p.product_name}`:''} (stock: {p.current_stock??0})</option>)}
                    </select>
                  </div>
                  <div><input type="number" className="input text-sm" placeholder="Qty" value={item.qty} onChange={e=>updateItem(i,'qty',e.target.value)} /></div>
                  <div><input type="number" className="input text-sm" placeholder="Unit price" value={item.unit_price} onChange={e=>updateItem(i,'unit_price',e.target.value)} /></div>
                  <div>
                    <div className="relative">
                      <input type="number" className="input text-sm pr-6" placeholder="Disc%" value={item.discount} onChange={e=>updateItem(i,'discount',e.target.value)} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-sm">
                      <p className="font-bold text-gray-800 dark:text-white">{fmt(Math.round(sub))}</p>
                      <p className={`text-xs ${profit>=0?'text-green-600':'text-red-500'}`}>{fmt(Math.round(profit))} profit</p>
                    </div>
                    <button onClick={()=>removeItem(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Order discount */}
      {form.items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Order Discount (PKR flat)</label>
            <input type="number" className="input" placeholder="e.g. 100" value={form.order_discount}
              onChange={e=>setForm(f=>({...f,order_discount:e.target.value,discount_pct:''}))} />
          </div>
          <div>
            <label className="label">OR Discount %</label>
            <div className="relative">
              <input type="number" className="input pr-7" placeholder="e.g. 10" value={form.discount_pct}
                onChange={e=>setForm(f=>({...f,discount_pct:e.target.value,order_discount:''}))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {form.items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
          <div><p className="text-xs text-gray-400">Subtotal</p><p className="font-bold text-gray-800 dark:text-white">{fmt(Math.round(subtotal))}</p></div>
          <div><p className="text-xs text-gray-400">Discount</p><p className="font-bold text-orange-500">-{fmt(Math.round(orderDisc))}</p></div>
          <div><p className="text-xs text-gray-400">Total</p><p className="font-bold text-primary text-lg">{fmt(Math.round(total))}</p></div>
          <div><p className="text-xs text-gray-400">Est. Profit</p><p className={`font-bold ${totalProfit>=0?'text-green-600':'text-red-500'}`}>{fmt(Math.round(totalProfit))}</p></div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving?'Saving…':'✅ Create Order'}
        </button>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function OrdersPage() {
  const searchParams = useSearchParams()
  const [orders,   setOrders]   = useState([])
  const [products, setProducts] = useState([])
  const [stocks,   setStocks]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [returnModal, setReturnModal] = useState(null)
  const [returnLoss,  setReturnLoss]  = useState('')

  useEffect(() => {
    Promise.all([api.get('/orders'), api.get('/products'), api.get('/stocks')])
      .then(([o,p,s]) => { setOrders(o); setProducts(p); setStocks(s) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = orders.filter(o => {
    const matchStatus = filter==='all' || o.status===filter
    const matchSearch = !search || o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone?.includes(search) || o.order_number?.includes(search)
    return matchStatus && matchSearch
  })

  const handleOrderSave = o => {
    setOrders(prev=>[o,...prev])
    setShowAdd(false)
  }

  const handleStatusChange = async (id, status) => {
    if (status==='returned') { setReturnModal(id); return }
    try {
      const updated = await api.patch(`/orders/${id}`,{status})
      setOrders(prev=>prev.map(o=>o._id===id?updated:o))
      toast.success(`Status → ${status}`)
    } catch(e){toast.error(e.message)}
  }

  const handleReturn = async () => {
    try {
      const updated = await api.patch(`/orders/${returnModal}`,{status:'returned',return_loss:parseFloat(returnLoss)||0})
      setOrders(prev=>prev.map(o=>o._id===returnModal?updated:o))
      toast.success('Marked as returned')
      setReturnModal(null); setReturnLoss('')
    } catch(e){toast.error(e.message)}
  }

  const handleDelete = async id => {
    if(!confirm('Delete this order?')) return
    await api.delete(`/orders/${id}`)
    setOrders(prev=>prev.filter(o=>o._id!==id))
    toast.success('Deleted')
  }

  const exportCSV = () => {
    if (!filtered.length) return toast.error('No orders to export')
    csvDownload(filtered.map(o=>({
      'Order#':o.order_number, Date:fmtDate(o.date), Customer:o.customer_name,
      Phone:o.customer_phone||'', Total:o.total, Profit:o.total_profit,
      Payment:o.payment_method, Status:o.status, Notes:o.notes||'',
    })),'orders.csv')
    toast.success('CSV exported!')
  }

  // Totals for filtered
  const active = filtered.filter(o=>!['cancelled','returned'].includes(o.status))
  const totalRev    = active.reduce((s,o)=>s+o.total,0)
  const totalProfit = active.reduce((s,o)=>s+o.total_profit,0)

  if (loading) return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-24"/>)}</div>

  return (
    <div className="space-y-5 slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🛒 Orders</h1>
          <p className="text-gray-400 text-sm">{orders.length} total · {active.length} active</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm">📥 CSV</button>
          <button onClick={()=>setShowAdd(v=>!v)} className="btn-primary">+ New Order</button>
        </div>
      </div>

      {/* Stats */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card text-center"><p className="text-xs text-gray-400 mb-1">Total Orders</p><p className="font-bold text-gray-900 dark:text-white">{orders.length}</p></div>
          <div className="card text-center"><p className="text-xs text-gray-400 mb-1">Revenue</p><p className="font-bold text-primary">{fmt(totalRev)}</p></div>
          <div className="card text-center"><p className="text-xs text-gray-400 mb-1">Profit</p><p className={`font-bold ${totalProfit>=0?'text-green-600':'text-red-500'}`}>{fmt(totalProfit)}</p></div>
          <div className="card text-center"><p className="text-xs text-gray-400 mb-1">Delivered</p><p className="font-bold text-green-600">{orders.filter(o=>o.status==='delivered').length}</p></div>
        </div>
      )}

      {/* New order form */}
      {showAdd && <NewOrderForm products={products} stocks={stocks} onSave={handleOrderSave} onCancel={()=>setShowAdd(false)} />}

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap">
        <input className="input flex-1 min-w-48" placeholder="Search customer, phone, order#…"
          value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUSES.map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${filter===s?'bg-primary text-white':'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
            {STATUS_ICON[s]||'📋'} {s.charAt(0).toUpperCase()+s.slice(1)} ({s==='all'?orders.length:orders.filter(o=>o.status===s).length})
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-14">
          <p className="text-4xl mb-3">🛒</p>
          <p className="font-semibold text-gray-600 dark:text-gray-300">{orders.length===0?'No orders yet':'No orders match this filter'}</p>
          {orders.length===0&&<button onClick={()=>setShowAdd(true)} className="btn-primary mt-4">+ Create First Order</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o=>(
            <div key={o._id} className="card hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gray-500">{o.order_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[o.status]||'bg-gray-100 text-gray-600'}`}>
                      {STATUS_ICON[o.status]} {o.status}
                    </span>
                    <span className="badge-purple text-xs">{o.payment_method}</span>
                  </div>
                  <p className="font-bold text-gray-800 dark:text-white mt-1">{o.customer_name}</p>
                  {o.customer_phone&&<p className="text-xs text-gray-400">{o.customer_phone}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(o.date)} · {o.items?.length||0} item{o.items?.length!==1?'s':''}</p>
                  {o.notes&&<p className="text-xs text-gray-400 italic mt-0.5">📝 {o.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-primary text-lg">{fmt(o.total)}</p>
                  <p className={`text-xs font-semibold ${o.total_profit>=0?'text-green-600':'text-red-500'}`}>{fmt(o.total_profit)} profit</p>
                  {o.order_discount>0&&<p className="text-xs text-orange-500">-{fmt(o.order_discount)} disc</p>}
                </div>
              </div>

              {/* Items preview */}
              {o.items?.length>0&&(
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-1.5">
                  {o.items.map((item,i)=>(
                    <span key={i} className="badge-yellow text-xs">
                      {item.product_code} ×{item.qty} @ {fmt(item.unit_price)}{item.discount>0?` (-${item.discount}%)`:''}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 flex-wrap">
                <p className="text-xs text-gray-400 mr-1">Change status:</p>
                {['confirmed','processing','shipped','delivered','returned','cancelled'].map(s=>(
                  o.status!==s&&(
                    <button key={s} onClick={()=>handleStatusChange(o._id,s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-80 ${STATUS_COLOR[s]}`}>
                      {STATUS_ICON[s]} {s}
                    </button>
                  )
                ))}
                <div className="flex-1" />
                <Link href={`/orders/${o._id}`} className="btn-secondary text-xs py-1.5">View →</Link>
                <button onClick={()=>handleDelete(o._id)} className="btn-danger text-xs py-1.5">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Return modal */}
      {returnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl slide-up">
            <h3 className="font-bold text-gray-800 dark:text-white mb-3">↩️ Mark as Returned</h3>
            <p className="text-sm text-gray-500 mb-4">Enter the financial loss from this return (your cost, not sell price).</p>
            <label className="label">Loss Amount (PKR)</label>
            <input type="number" className="input mb-4" placeholder="e.g. 500 (cost of goods)"
              value={returnLoss} onChange={e=>setReturnLoss(e.target.value)} autoFocus />
            <div className="flex gap-3">
              <button onClick={handleReturn} className="btn-danger flex-1">↩️ Confirm Return</button>
              <button onClick={()=>{setReturnModal(null);setReturnLoss('')}} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
