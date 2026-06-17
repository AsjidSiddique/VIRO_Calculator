import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Cost } from '@/models'
import { recalcStock } from '@/lib/recalcStock'

export async function GET(req) {
  try {
    verifyToken(req)
    await connectDB()
    const { searchParams } = new URL(req.url)
    const filter = {}
    if (searchParams.get('stock_id')) filter.stock_id = searchParams.get('stock_id')
    const costs = await Cost.find(filter).sort({ createdAt: -1 })
    return NextResponse.json(costs)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    verifyToken(req)
    await connectDB()
    const body = await req.json()

    // If parts provided, sum them as amount
    let amount = Number(body.amount) || 0
    if (body.parts && body.parts.length > 0) {
      amount = body.parts.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    }

    const cost = await Cost.create({ ...body, amount })
    if (body.stock_id) await recalcStock(body.stock_id)
    return NextResponse.json(cost)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
