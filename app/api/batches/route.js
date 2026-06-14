import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { StockBatch, Cost } from '@/models'
import { recalcStock } from '@/lib/recalcStock'

export async function GET(req) {
  try {
    verifyToken(req)
    await connectDB()
    const { searchParams } = new URL(req.url)
    const filter = {}
    if (searchParams.get('stock_id')) filter.stock_id = searchParams.get('stock_id')
    const batches = await StockBatch.find(filter).sort({ date_purchased: -1 })
    return NextResponse.json(batches)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    verifyToken(req)
    await connectDB()
    const body = await req.json()

    const buy_amount          = Number(body.buy_amount) || 0
    const interest_rate       = Number(body.interest_rate) || 0
    const interest_amount     = (buy_amount * interest_rate) / 100
    const total_with_interest = buy_amount + interest_amount

    const batch = await StockBatch.create({
      ...body,
      buy_amount,
      interest_rate,
      interest_amount,
      total_with_interest,
    })

    // Auto-create interest cost entry if applicable
    if (interest_amount > 0 && body.stock_id) {
      await Cost.create({
        stock_id: body.stock_id,
        name:     `Interest — ${body.batch_name}`,
        amount:   interest_amount,
        category: 'Interest',
        type:     'fixed',
      })
    }

    // Recalc stock totals (uses batches sum as total_buy_amount)
    if (body.stock_id) await recalcStock(body.stock_id)

    return NextResponse.json(batch)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
