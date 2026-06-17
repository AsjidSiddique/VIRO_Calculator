'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/apiClient'
import { fmt, fmtDate, fmtPct } from '@/lib/format'
import { toast } from '@/components/Toast'

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
const STATUSES = ['pending','confirmed','processing','shipped','delivered','returned','cancelled']
const PAYMENT_METHODS = ['COD','JazzCash','EasyPaisa','Cash','Bank','Other']

export default function OrderDetail() {
  const { id }   = useParams()
  const router   = useRouter()
  const [order,    setOrder]    = useState(null)
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState(null)

  useEffect(() => {
    Promise.all([api.get(`/orders/${id}`), api.get('/products')])
      .then(([o, p]) => {
        setOrder(o)
        setProducts(p)
        setForm({
          customer_name:  o.customer_name,
          customer_phone: o.customer_phone || '',
          date:           new Date(o.date).toISOString().slice(0,10),
          payment_method: o.payment_method,
          status:         o.status,
          stock_id:       o.stock_id || '',
          items:          o.items.map(i => ({
            product_id:   i.product_id || '',
            product_code: i.product_code || '',
            product_name: i.product_name || '',
            qty:          i.qty,
            unit_price:   i.unit_price,
            cost_price:   i.cost_price,
            discount:     i.discount || 0,
          })),
          order_discount: o.order_discount || '',
          discount_pct:   o.discount_pct || '',
          notes:          o.notes || '',
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  /* ── Item helpers ── */
  const addItem = () => setForm(f => ({
    ...f, items: [...f.items, { product_id:'', product_code:'', product_name:'', qty:1, unit_price:'', cost_price:0, discount:0 }]
  }))

  const updateItem = (i, field, val) => setForm(f => {
    const items = [...f.items]
    items[i] = { ...items[i], [field]: val }
    if (field === 'product_id') {
      const p = products.find(x => x._id === val)
      if (p) {
        items[i].product_code = p.product_code
        items[i].product_name = p.product_name || ''
        items[i].cost_price   = p.cost_price || 0
        if (!items[i].unit_price) items[i].unit_price = p.discount_price || p.regular_price || 0
      }
    }
    return { ...f, items }
  })

  const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_,j) => j !== i) }))

  /* ── Calculations ── */
  const calcFromForm = (f) => {
    if (!f) return {}
    const subtotal = f.items.reduce((s, i) => {
      const line = (parseFloat(i.unit_price)||0) * (parseInt(i.qty)||1)
      return s + line * (1 - (parseFloat(i.discount)||0)/100)
    }, 0)
    const orderDisc = f.order_discount
      ? parseFloat(f.order_discount)||0
      : subtotal * ((parseFloat(f.discount_pct)||0)/100)
    const total      = Math.max(0, subtotal - orderDisc)
    const total_cost = f.items.reduce((s,i) => (parseFloat(i.cost_price)||0)*(parseInt(i.qty)||1)+s, 0)
    return { subtotal, orderDisc, total, total_cost, total_profit: total - total_cost }
  }

  const { subtotal, orderDisc, total, total_cost, total_profit } = calcFromForm(form)

  /* ── Save edits ── */
  const handleSave = async () => {
    if (!form.customer_name.trim()) return toast.error('Customer name required')
    setSaving(true)
    try {
      const updated = await api.put(`/orders/${id}`, form)
      setOrder(updated)
      setEditing(false)
      toast.success('Order updated!')
    } catch(e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  /* ── Status change ── */
  const handleStatus = async (status) => {
    try {
      const updated = await api.patch(`/orders/${id}`, { status })
      setOrder(updated)
      toast.success(`Status → ${status}`)
    } catch(e) { toast.error(e.message) }
  }

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!confirm('Delete this order?')) return
    await api.delete(`/orders/${id}`)
    toast.success('Order deleted')
    router.push('/orders')
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-12 w-48" />
      <div className="skeleton h-40" />
      <div className="skeleton h-60" />
    </div>
  )

  if (!order) return (
    <div className="card text-center py-10">
      <p className="text-gray-400">Order not found</p>
      <Link href="/orders" className="btn-primary mt-4 inline-block">← Back to Orders</Link>
    </div>
  )

  return (
    <div className="space-y-5 slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/orders" className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all text-sm">←</Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{order.order_number}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[order.status]}`}>
              {STATUS_ICON[order.status]} {order.status}
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">{fmtDate(order.date)}</p>
        </div>
        <div className="flex gap-2">
          {!editing && <button onClick={() => setEditing(true)} className="btn-secondary text-sm">✏️ Edit</button>}
          <button onClick={handleDelete} className="btn-danger text-sm">🗑️</button>
        </div>
      </div>

      {/* View mode */}
      {!editing && (
        <>
          {/* Customer + payment info */}
          <div className="card">
            <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide mb-3">👤 Customer</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400">Name</p>
                <p className="font-semibold text-gray-800 dark:text-white">{order.customer_name}</p>
              </div>
              {order.customer_phone && (
                <div>
                  <p className="text-xs text-gray-400">Phone</p>
                  <a href={`tel:${order.customer_phone}`} className="font-semibold text-primary">{order.customer_phone}</a>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Payment</p>
                <p className="font-semibold">{order.payment_method}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Date</p>
                <p className="font-semibold">{fmtDate(order.date)}</p>
              </div>
            </div>
            {order.notes && <p className="mt-3 text-sm text-gray-500 italic bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">📝 {order.notes}</p>}
          </div>

          {/* Financial summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 mb-1">Subtotal</p>
              <p className="font-bold text-gray-800 dark:text-white">{fmt(order.subtotal)}</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 mb-1">Discount</p>
              <p className="font-bold text-orange-500">-{fmt(order.order_discount)}</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 mb-1">Total Paid</p>
              <p className="font-bold text-primary text-lg">{fmt(order.total)}</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-xs text-gray-400 mb-1">Profit</p>
              <p className={`font-bold ${order.total_profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(order.total_profit)}</p>
            </div>
          </div>

          {/* Items */}
          <div className="card">
            <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide mb-3">🏷️ Items ({order.items?.length || 0})</h2>
            <div className="space-y-2">
              {order.items?.map((item, i) => {
                const lineTotal = (item.unit_price||0) * (item.qty||1)
                const sub       = lineTotal * (1 - (item.discount||0)/100)
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="badge-purple text-xs">{item.product_code}</span>
                        {item.product_name && <span className="text-sm text-gray-700 dark:text-gray-300">{item.product_name}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmt(item.unit_price)} × {item.qty}
                        {item.discount > 0 && <span className="text-orange-500 ml-1">(-{item.discount}% disc)</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800 dark:text-white">{fmt(Math.round(sub))}</p>
                      <p className={`text-xs ${item.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(Math.round(item.profit))} profit</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Status change */}
          <div className="card">
            <h2 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide mb-3">🔄 Change Status</h2>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button key={s} onClick={() => handleStatus(s)} disabled={order.status === s}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all
                    ${order.status === s
                      ? `${STATUS_COLOR[s]} ring-2 ring-offset-1 ring-current opacity-100`
                      : `${STATUS_COLOR[s]} opacity-60 hover:opacity-100`
                    }`}>
                  {STATUS_ICON[s]} {s}
                </button>
              ))}
            </div>
            {order.is_returned && (
              <p className="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                ↩️ Return loss recorded: <b>{fmt(order.return_loss)}</b>
              </p>
            )}
          </div>
        </>
      )}

      {/* Edit mode */}
      {editing && form && (
        <div className="card border-2 border-primary/20 space-y-4 slide-up">
          <h3 className="font-bold text-gray-800 dark:text-white">✏️ Edit Order {order.order_number}</h3>

          {/* Customer info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Customer Name *</label>
              <input className="input" value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.customer_phone}
                onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Payment</label>
              <select className="input" value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="label">Notes</label>
              <input className="input" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">🏷️ Items</p>
              <button onClick={addItem} className="text-primary text-sm font-semibold hover:underline">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => {
                const line = (parseFloat(item.unit_price)||0) * (parseInt(item.qty)||1)
                const sub  = line * (1 - (parseFloat(item.discount)||0)/100)
                const prof = sub - (parseFloat(item.cost_price)||0)*(parseInt(item.qty)||1)
                return (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                      <div className="col-span-2 md:col-span-2">
                        <select className="input text-sm" value={item.product_id}
                          onChange={e => updateItem(i, 'product_id', e.target.value)}>
                          <option value="">Select product…</option>
                          {products.map(p => (
                            <option key={p._id} value={p._id}>
                              {p.product_code}{p.product_name ? ` · ${p.product_name}` : ''} (stock: {p.current_stock??0})
                            </option>
                          ))}
                        </select>
                      </div>
                      <input type="number" className="input text-sm" placeholder="Qty" value={item.qty}
                        onChange={e => updateItem(i, 'qty', e.target.value)} />
                      <input type="number" className="input text-sm" placeholder="Price" value={item.unit_price}
                        onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                      <div className="relative">
                        <input type="number" className="input text-sm pr-6" placeholder="Disc%" value={item.discount}
                          onChange={e => updateItem(i, 'discount', e.target.value)} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 text-sm">
                          <p className="font-bold">{fmt(Math.round(sub))}</p>
                          <p className={`text-xs ${prof>=0?'text-green-600':'text-red-500'}`}>{fmt(Math.round(prof))} profit</p>
                        </div>
                        <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Discounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Order Discount (PKR)</label>
              <input type="number" className="input" placeholder="100" value={form.order_discount}
                onChange={e => setForm(f => ({ ...f, order_discount: e.target.value, discount_pct: '' }))} />
            </div>
            <div>
              <label className="label">OR Discount %</label>
              <div className="relative">
                <input type="number" className="input pr-7" placeholder="10" value={form.discount_pct}
                  onChange={e => setForm(f => ({ ...f, discount_pct: e.target.value, order_discount: '' }))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Live totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
            <div><p className="text-xs text-gray-400">Subtotal</p><p className="font-bold">{fmt(Math.round(subtotal))}</p></div>
            <div><p className="text-xs text-gray-400">Discount</p><p className="font-bold text-orange-500">-{fmt(Math.round(orderDisc))}</p></div>
            <div><p className="text-xs text-gray-400">Total</p><p className="font-bold text-primary text-lg">{fmt(Math.round(total))}</p></div>
            <div><p className="text-xs text-gray-400">Profit</p><p className={`font-bold ${total_profit>=0?'text-green-600':'text-red-500'}`}>{fmt(Math.round(total_profit))}</p></div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : '✅ Save Changes'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
