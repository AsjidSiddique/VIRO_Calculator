import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { StockBatch, Cost } from '@/models'
import { recalcStock } from '@/lib/recalcStock'

export async function PUT(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const body = await req.json()

    const buy_amount          = Number(body.buy_amount) || 0
    const interest_rate       = Number(body.interest_rate) || 0
    const interest_amount     = (buy_amount * interest_rate) / 100
    const total_with_interest = buy_amount + interest_amount

    const batch = await StockBatch.findByIdAndUpdate(params.id, {
      ...body, buy_amount, interest_rate, interest_amount, total_with_interest,
    }, { new: true })

    if (batch?.stock_id) await recalcStock(batch.stock_id)
    return NextResponse.json(batch)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const batch = await StockBatch.findByIdAndDelete(params.id)

    // Remove auto-created interest cost
    if (batch?.interest_amount > 0 && batch?.stock_id) {
      await Cost.deleteOne({
        stock_id: batch.stock_id,
        name: `Interest — ${batch.batch_name}`,
      })
    }

    if (batch?.stock_id) await recalcStock(batch.stock_id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
