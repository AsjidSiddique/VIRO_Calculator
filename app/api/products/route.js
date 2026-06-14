import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Product, Stock } from '@/models'
import { recalcStock } from '@/lib/recalcStock'

function calcProduct(body, mult) {
  const buy   = Number(body.buy_price) || 0
  const qty   = Number(body.quantity_bought) || 0
  const total_buy          = buy * qty
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
  return { total_buy, cost_price, regular_price, discount_price, profit_on_regular, profit_on_discount, effective_cost_price, current_stock: qty }
}

export async function GET(req) {
  try {
    verifyToken(req)
    await connectDB()
    const { searchParams } = new URL(req.url)
    const byCode   = searchParams.get('byCode')
    const stock_id = searchParams.get('stock_id')
    const search   = searchParams.get('search')
    const category = searchParams.get('category')

    if (byCode) {
      const p = await Product.findOne({ product_code: byCode.toUpperCase() }).sort({ createdAt: -1 })
      return NextResponse.json(p ? { product_code: p.product_code, product_name: p.product_name, category: p.category } : null)
    }

    const filter = {}
    if (stock_id)  filter.stock_id = stock_id
    if (category)  filter.category = { $regex: category, $options: 'i' }
    if (search)    filter.$or = [
      { product_code: { $regex: search, $options: 'i' } },
      { product_name: { $regex: search, $options: 'i' } },
    ]
    const products = await Product.find(filter).populate('stock_id', 'stock_name date_added').sort({ createdAt: -1 })
    return NextResponse.json(products)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    verifyToken(req)
    await connectDB()
    const body  = await req.json()
    const stock = await Stock.findById(body.stock_id)
    const mult  = stock?.cost_multiplier || 0
    const calc  = calcProduct(body, mult)

    const product = await Product.create({
      ...body,
      product_code: body.product_code.toUpperCase(),
      ...calc,
    })

    // Recalc stock — if no batches exist, products sum is used as total_buy
    await recalcStock(body.stock_id)
    return NextResponse.json(product)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
