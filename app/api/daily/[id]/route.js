import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { DailyRecord } from '@/models'

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

export async function PUT(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const body   = await req.json()
    const totals = calcTotals(body)
    const record = await DailyRecord.findByIdAndUpdate(params.id, { ...body, ...totals }, { new: true })
    return NextResponse.json(record)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    await DailyRecord.findByIdAndDelete(params.id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
