import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { StockMovement, Product } from '@/models'

export async function PUT(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const body = await req.json()
    const movement = await StockMovement.findByIdAndUpdate(params.id, body, { new: true })
    return NextResponse.json(movement)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const movement = await StockMovement.findByIdAndDelete(params.id)
    // Reverse the stock change
    if (movement) {
      const product = await Product.findById(movement.product_id)
      if (product) {
        const reversal = movement.type === 'add' ? -movement.qty : movement.qty
        product.current_stock = Math.max(0, (product.current_stock || 0) + reversal)
        await product.save()
      }
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
