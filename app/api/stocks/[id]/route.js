import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Stock, Product, Cost } from '@/models'
import { recalcStock } from '@/lib/recalcStock'

export async function PUT(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const body  = await req.json()
    const stock = await Stock.findByIdAndUpdate(params.id, body, { new: true })
    return NextResponse.json(stock)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    await Stock.findByIdAndDelete(params.id)
    await Product.deleteMany({ stock_id: params.id })
    await Cost.deleteMany({ stock_id: params.id })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH = manual recalc trigger from frontend
export async function PATCH(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const stock = await recalcStock(params.id)
    return NextResponse.json(stock)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
