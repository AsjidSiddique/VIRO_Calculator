import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Order, Product } from '@/models'

function calcOrder(body) {
  const items = body.items || []
  const subtotal = items.reduce((s, i) => {
    const lineTotal = (Number(i.unit_price) || 0) * (Number(i.qty) || 1)
    const discounted = lineTotal * (1 - (Number(i.discount) || 0) / 100)
    return s + discounted
  }, 0)

  // Order-level discount
  let orderDisc = 0
  if (body.order_discount) {
    orderDisc = Number(body.order_discount) || 0
  } else if (body.discount_pct) {
    orderDisc = subtotal * (Number(body.discount_pct) / 100)
  }
  const total      = Math.max(0, subtotal - orderDisc)
  const total_cost = items.reduce((s, i) => s + (Number(i.cost_price) || 0) * (Number(i.qty) || 1), 0)
  const total_profit = total - total_cost

  // Enrich items with subtotal + profit
  const enrichedItems = items.map(i => {
    const lineTotal  = (Number(i.unit_price) || 0) * (Number(i.qty) || 1)
    const sub        = lineTotal * (1 - (Number(i.discount) || 0) / 100)
    const profit     = sub - (Number(i.cost_price) || 0) * (Number(i.qty) || 1)
    return { ...i, subtotal: sub, profit }
  })

  return { items: enrichedItems, subtotal, order_discount: orderDisc, total, total_cost, total_profit }
}

async function nextOrderNumber() {
  const last = await Order.findOne().sort({ createdAt: -1 }).select('order_number')
  if (!last?.order_number) return 'ORD-0001'
  const num = parseInt(last.order_number.replace('ORD-', '')) + 1
  return `ORD-${String(num).padStart(4, '0')}`
}

export async function GET(req) {
  try {
    verifyToken(req)
    await connectDB()
    const { searchParams } = new URL(req.url)

    // Summary for dashboard
    if (searchParams.get('summary') === '1') {
      const days = parseInt(searchParams.get('days')) || 30
      const from = new Date(); from.setDate(from.getDate() - days)
      const orders = await Order.find({ date: { $gte: from }, status: { $nin: ['cancelled','returned'] } })
      return NextResponse.json({
        total_orders:  orders.length,
        total_revenue: orders.reduce((s, o) => s + o.total, 0),
        total_profit:  orders.reduce((s, o) => s + o.total_profit, 0),
      })
    }

    const filter = {}
    if (searchParams.get('status'))   filter.status   = searchParams.get('status')
    if (searchParams.get('stock_id')) filter.stock_id = searchParams.get('stock_id')
    if (searchParams.get('search')) {
      filter.$or = [
        { customer_name:  { $regex: searchParams.get('search'), $options: 'i' } },
        { customer_phone: { $regex: searchParams.get('search'), $options: 'i' } },
        { order_number:   { $regex: searchParams.get('search'), $options: 'i' } },
      ]
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100)
    return NextResponse.json(orders)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    verifyToken(req)
    await connectDB()
    const body    = await req.json()
    const calc    = calcOrder(body)
    const order_number = await nextOrderNumber()

    const order = await Order.create({
      ...body,
      ...calc,
      order_number,
    })

    // Deduct stock for each item
    for (const item of calc.items) {
      if (item.product_id) {
        await Product.findByIdAndUpdate(item.product_id, {
          $inc: { current_stock: -(Number(item.qty) || 1) },
        })
      }
    }

    return NextResponse.json(order)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
