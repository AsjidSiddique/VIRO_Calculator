import { NextResponse } from 'next/server'
import { connectDB }    from '@/lib/db'
import { verifyToken }  from '@/lib/auth'
import { Stock, StockBatch, Cost } from '@/models'

export async function GET(req) {
  try {
    verifyToken(req)
    await connectDB()

    const stocks = await Stock.find().sort({ date_added: -1 })

    // For each stock, compute live total_buy_amount from batches (never stale)
    const enriched = await Promise.all(stocks.map(async stk => {
      const [batches, costs] = await Promise.all([
        StockBatch.find({ stock_id: stk._id }),
        Cost.find({ stock_id: stk._id }),
      ])
      const batchBuyTotal = batches.reduce((s, b) => s + (Number(b.buy_amount) || 0), 0)
      const totalBuy      = batchBuyTotal > 0 ? batchBuyTotal : (stk.total_buy_amount || 0)
      const totalCosts    = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0)
      const costMultiplier = totalBuy > 0 ? totalCosts / totalBuy : (stk.cost_multiplier || 0)

      return {
        ...stk.toObject(),
        total_buy_amount:  totalBuy,
        total_cost_amount: totalBuy + totalCosts,
        cost_multiplier:   costMultiplier,
        _live_batch_total: batchBuyTotal, // extra field frontend can use
      }
    }))

    return NextResponse.json(enriched)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    verifyToken(req)
    await connectDB()
    const body  = await req.json()
    const stock = await Stock.create(body)
    return NextResponse.json(stock)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
