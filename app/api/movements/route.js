import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { StockMovement } from '@/models'

export async function GET(req) {
  try {
    verifyToken(req)
    await connectDB()
    const { searchParams } = new URL(req.url)
    const filter = {}
    if (searchParams.get('product_id')) filter.product_id = searchParams.get('product_id')
    if (searchParams.get('stock_id'))   filter.stock_id   = searchParams.get('stock_id')
    const movements = await StockMovement.find(filter)
      .sort({ date: -1 })
      .populate('product_id', 'product_code product_name')
      .limit(200)
    return NextResponse.json(movements)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
