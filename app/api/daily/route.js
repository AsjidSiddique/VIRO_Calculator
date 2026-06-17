import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { DailyRecord, Product } from '@/models'

function calcTotals(body) {
  const sales    = body.sales || []
  const returns  = body.cod_returns || []
  const expenses = body.other_expenses || []
  const total_revenue        = sales.reduce((s, i) => s + (Number(i.revenue) || 0), 0)
  const total_cost           = sales.reduce((s, i) => s + ((Number(i.cost_price) || 0) * (Number(i.qty_sold) || 0)), 0)
  const total_profit         = total_revenue - total_cost
  const total_returns_loss   = returns.reduce((s, r) => s + (Number(r.loss_amount) || 0), 0)
  const total_other_expenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const net_profit           = total_profit - total_returns_loss - total_other_expenses
  return { total_revenue, total_cost, total_profit, total_returns_loss, total_other_expenses, net_profit }
}

export async function GET(req) {
  try {
    verifyToken(req)
    await connectDB()
    const { searchParams } = new URL(req.url)
    const filter = {}
    if (searchParams.get('from')) filter.date = { $gte: new Date(searchParams.get('from')) }
    if (searchParams.get('to'))   filter.date = { ...filter.date, $lte: new Date(searchParams.get('to')) }

    // Summary mode
    if (searchParams.get('summary') === '1') {
      const days = parseInt(searchParams.get('days')) || 30
      const from = new Date(); from.setDate(from.getDate() - days)
      const records = await DailyRecord.find({ date: { $gte: from } }).sort({ date: 1 })
      return NextResponse.json({
        total_revenue: records.reduce((s, r) => s + r.total_revenue, 0),
        total_profit:  records.reduce((s, r) => s + r.net_profit, 0),
        total_returns: records.reduce((s, r) => s + r.total_returns_loss, 0),
        count:         records.length,
        chart:         records.map(r => ({ date: r.date, revenue: r.total_revenue, profit: r.net_profit })),
      })
    }

    const records = await DailyRecord.find(filter).sort({ date: -1 }).limit(60)
    return NextResponse.json(records)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    verifyToken(req)
    await connectDB()
    const body = await req.json()
    const totals = calcTotals(body)
    const record = await DailyRecord.create({ ...body, ...totals })
    // Deduct sold qty from products
    for (const sale of (body.sales || [])) {
      if (sale.product_id) {
        await Product.findByIdAndUpdate(sale.product_id, { $inc: { current_stock: -(Number(sale.qty_sold) || 0) } })
      }
    }
    return NextResponse.json(record)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
