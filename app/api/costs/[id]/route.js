import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Cost } from '@/models'
import { recalcStock } from '@/lib/recalcStock'

export async function PUT(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const body = await req.json()
    let amount = Number(body.amount) || 0
    if (body.parts && body.parts.length > 0) {
      amount = body.parts.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    }
    const cost = await Cost.findByIdAndUpdate(params.id, { ...body, amount }, { new: true })
    if (cost?.stock_id) await recalcStock(cost.stock_id)
    return NextResponse.json(cost)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const cost = await Cost.findByIdAndDelete(params.id)
    if (cost?.stock_id) await recalcStock(cost.stock_id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
