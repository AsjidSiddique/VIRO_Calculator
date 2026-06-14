import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Marketing, Cost } from '@/models'
import { recalcStock } from '@/lib/recalcStock'

function calcCampaign(data) {
  const estimated = Number(data.estimated_budget) || 0
  const actual    = Number(data.actual_budget)    || 0
  const orders    = Number(data.actual_orders)    || 0
  const revenue   = Number(data.actual_revenue)   || 0

  // budget = actual if entered, else estimated
  const budget = actual > 0 ? actual : estimated

  const cost_per_order = budget > 0 && orders > 0  ? budget / orders  : null
  const roas           = budget > 0 && revenue > 0 ? revenue / budget : null

  // Auto-set status
  let status = data.status || 'planned'
  if (actual > 0 && orders > 0) status = 'completed'
  else if (data.status === 'running') status = 'running'

  return { ...data, budget, cost_per_order, roas, status }
}

export async function GET(req) {
  try {
    verifyToken(req)
    await connectDB()
    const { searchParams } = new URL(req.url)
    const filter = {}
    if (searchParams.get('stock_id')) filter.stock_id = searchParams.get('stock_id')
    const campaigns = await Marketing.find(filter).sort({ date: -1 })
    return NextResponse.json(campaigns)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    verifyToken(req)
    await connectDB()
    const body = await req.json()
    const calc = calcCampaign(body)

    const campaign = await Marketing.create(calc)

    // If "add to stock cost" is checked — create a Cost entry on the stock
    if (body.add_to_stock_cost && body.stock_id && calc.budget > 0) {
      const costName = `Marketing — ${body.campaign_name || body.platform} (${body.status === 'completed' ? 'Actual' : 'Estimated'})`
      const cost = await Cost.create({
        stock_id: body.stock_id,
        name:     costName,
        amount:   calc.budget,
        category: 'Marketing/Ads',
        type:     'fixed',
        parts:    [],
      })
      // Link the cost back to the campaign
      await Marketing.findByIdAndUpdate(campaign._id, { cost_id: cost._id })
      await recalcStock(body.stock_id)
    }

    return NextResponse.json(campaign)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
