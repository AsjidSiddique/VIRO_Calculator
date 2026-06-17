import { Stock, StockBatch, Cost, Product } from '@/models'

export async function recalcStock(stockId) {
  const [batches, products, costs] = await Promise.all([
    StockBatch.find({ stock_id: stockId }),
    Product.find({ stock_id: stockId }),
    Cost.find({ stock_id: stockId }),
  ])

  // total_buy_amount from batches (buy_amount only — interest tracked as separate Cost)
  let total_buy_amount = 0
  if (batches.length > 0) {
    total_buy_amount = batches.reduce((s, b) => s + (Number(b.buy_amount) || 0), 0)
  } else {
    total_buy_amount = products.reduce((s, p) => s + (Number(p.total_buy) || 0), 0)
  }

  const total_costs       = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const cost_multiplier   = total_buy_amount > 0 ? total_costs / total_buy_amount : 0
  const total_cost_amount = total_buy_amount + total_costs

  const updated = await Stock.findByIdAndUpdate(
    stockId,
    { total_buy_amount, total_cost_amount, cost_multiplier },
    { new: true }
  )

  // Recalculate every product's cost_price
  for (const p of products) {
    const cost_price         = (Number(p.buy_price) || 0) * (1 + cost_multiplier)
    const regular_price      = Number(p.regular_price)  || 0
    const discount_price     = Number(p.discount_price) || 0
    const profit_on_regular  = cost_price > 0 && regular_price  > 0 ? ((regular_price  - cost_price) / cost_price) * 100 : 0
    const profit_on_discount = cost_price > 0 && discount_price > 0 ? ((discount_price - cost_price) / cost_price) * 100 : 0
    const mktPct    = (Number(p.expected_marketing_pct)  || 0) / 100
    const codRetPct = (Number(p.expected_cod_return_pct) || 0) / 100
    const codCharge = Number(p.cod_charge_per_order) || 0
    const sell      = discount_price || regular_price || 0
    const effective_cost_price = cost_price + sell * mktPct + sell * codRetPct + codCharge
    await Product.findByIdAndUpdate(p._id, { cost_price, profit_on_regular, profit_on_discount, effective_cost_price })
  }

  return updated
}
