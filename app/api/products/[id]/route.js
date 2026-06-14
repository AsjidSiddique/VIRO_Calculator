import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Product, Stock } from '@/models'
import { recalcStock } from '@/lib/recalcStock'

function calcProduct(body, mult) {
  const buy   = Number(body.buy_price) || 0
  const cost_price         = buy * (1 + mult)
  const regular_price      = body.regular_price  ? Number(body.regular_price)  : Math.round(cost_price * 2)
  const discount_price     = body.discount_price ? Number(body.discount_price) : regular_price
  const profit_on_regular  = cost_price > 0 ? ((regular_price  - cost_price) / cost_price) * 100 : 0
  const profit_on_discount = cost_price > 0 ? ((discount_price - cost_price) / cost_price) * 100 : 0
  const mktPct    = (Number(body.expected_marketing_pct)  || 0) / 100
  const codRetPct = (Number(body.expected_cod_return_pct) || 0) / 100
  const codCharge = Number(body.cod_charge_per_order) || 0
  const sell      = discount_price || regular_price
  const effective_cost_price = cost_price + sell * mktPct + sell * codRetPct + codCharge
  return { cost_price, regular_price, discount_price, profit_on_regular, profit_on_discount, effective_cost_price }
}

export async function PUT(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const body     = await req.json()
    const existing = await Product.findById(params.id)
    const stock    = await Stock.findById(existing.stock_id)
    const mult     = stock?.cost_multiplier || 0
    const total_buy = (Number(body.buy_price) || existing.buy_price) * (Number(body.quantity_bought) || existing.quantity_bought)
    const calc  = calcProduct({ ...existing.toObject(), ...body }, mult)
    const product = await Product.findByIdAndUpdate(params.id, { ...body, total_buy, ...calc }, { new: true })
    await recalcStock(existing.stock_id)
    return NextResponse.json(product)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const product = await Product.findByIdAndDelete(params.id)
    if (product?.stock_id) await recalcStock(product.stock_id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH = quick stock count update (sold / add)
export async function PATCH(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const { qty_change } = await req.json()
    const product = await Product.findById(params.id)
    product.current_stock = Math.max(0, (product.current_stock || 0) + qty_change)
    await product.save()
    return NextResponse.json(product)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
