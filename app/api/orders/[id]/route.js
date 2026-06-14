import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Order, Product } from '@/models'

function calcOrder(body) {
  const items = body.items || []
  const subtotal = items.reduce((s, i) => {
    const line = (Number(i.unit_price) || 0) * (Number(i.qty) || 1)
    return s + line * (1 - (Number(i.discount) || 0) / 100)
  }, 0)
  let orderDisc = body.order_discount
    ? Number(body.order_discount)
    : subtotal * ((Number(body.discount_pct) || 0) / 100)
  const total       = Math.max(0, subtotal - orderDisc)
  const total_cost  = items.reduce((s, i) => s + (Number(i.cost_price)||0) * (Number(i.qty)||1), 0)
  const total_profit = total - total_cost
  const enrichedItems = items.map(i => {
    const line = (Number(i.unit_price)||0) * (Number(i.qty)||1)
    const sub  = line * (1 - (Number(i.discount)||0)/100)
    return { ...i, subtotal: sub, profit: sub - (Number(i.cost_price)||0)*(Number(i.qty)||1) }
  })
  return { items: enrichedItems, subtotal, order_discount: orderDisc, total, total_cost, total_profit }
}

export async function GET(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const order = await Order.findById(params.id)
    return NextResponse.json(order)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const body  = await req.json()
    const calc  = calcOrder(body)
    const order = await Order.findByIdAndUpdate(params.id, { ...body, ...calc }, { new: true })
    return NextResponse.json(order)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH = update status only (or mark returned with loss)
export async function PATCH(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const { status, return_loss } = await req.json()
    const update = { status }

    if (status === 'returned') {
      update.is_returned  = true
      update.return_loss  = Number(return_loss) || 0
      update.total_profit = -(Number(return_loss) || 0) // loss recorded
      // Restore stock
      const order = await Order.findById(params.id)
      for (const item of order.items) {
        if (item.product_id) {
          await Product.findByIdAndUpdate(item.product_id, {
            $inc: { current_stock: Number(item.qty) || 1 },
          })
        }
      }
    }

    const order = await Order.findByIdAndUpdate(params.id, update, { new: true })
    return NextResponse.json(order)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    await Order.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
