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
  const budget    = actual > 0 ? actual : estimated
  const cost_per_order = budget > 0 && orders > 0  ? budget / orders  : null
  const roas           = budget > 0 && revenue > 0 ? revenue / budget : null
  let status = data.status || 'planned'
  if (actual > 0 && orders > 0) status = 'completed'
  else if (data.status === 'running') status = 'running'
  return { ...data, budget, cost_per_order, roas, status }
}

export async function PUT(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const body     = await req.json()
    const calc     = calcCampaign(body)
    const existing = await Marketing.findById(params.id)

    // Update linked cost if budget changed
    if (existing?.cost_id && calc.budget !== existing.budget) {
      const costName = `Marketing — ${body.campaign_name || body.platform} (${calc.status === 'completed' ? 'Actual' : 'Estimated'})`
      await Cost.findByIdAndUpdate(existing.cost_id, {
        amount: calc.budget,
        name:   costName,
      })
      if (existing.stock_id) await recalcStock(existing.stock_id)
    }

    // If cost not yet linked but "add_to_stock_cost" now checked
    if (!existing?.cost_id && body.add_to_stock_cost && body.stock_id && calc.budget > 0) {
      const costName = `Marketing — ${body.campaign_name || body.platform} (${calc.status === 'completed' ? 'Actual' : 'Estimated'})`
      const cost = await Cost.create({
        stock_id: body.stock_id,
        name:     costName,
        amount:   calc.budget,
        category: 'Marketing/Ads',
        type:     'fixed',
      })
      calc.cost_id = cost._id
      await recalcStock(body.stock_id)
    }

    const campaign = await Marketing.findByIdAndUpdate(params.id, calc, { new: true })
    return NextResponse.json(campaign)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    verifyToken(req)
    await connectDB()
    const campaign = await Marketing.findByIdAndDelete(params.id)
    // Remove linked cost entry from stock
    if (campaign?.cost_id) {
      await Cost.findByIdAndDelete(campaign.cost_id)
      if (campaign.stock_id) await recalcStock(campaign.stock_id)
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
