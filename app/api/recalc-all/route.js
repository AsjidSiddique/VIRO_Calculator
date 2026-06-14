import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Stock } from '@/models'
import { recalcStock } from '@/lib/recalcStock'

// POST /api/recalc-all → recalculates every stock in the database
export async function POST(req) {
  try {
    verifyToken(req)
    await connectDB()
    const stocks = await Stock.find()
    const results = []
    for (const s of stocks) {
      const updated = await recalcStock(s._id)
      results.push({
        id:   updated._id,
        name: updated.stock_name,
        total_buy_amount:  updated.total_buy_amount,
        total_costs:       updated.total_cost_amount - updated.total_buy_amount,
        cost_multiplier:   (updated.cost_multiplier * 100).toFixed(2) + '%',
        total_cost_amount: updated.total_cost_amount,
      })
    }
    return NextResponse.json({ success: true, recalculated: results.length, results })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
