import { Stock, StockBatch, Cost, Product } from '@/models'

/**
 * THE CORRECT FORMULA:
 *
 * total_buy_amount = sum of ALL batch buy_amounts (the raw purchase money spent)
 *                   e.g. Bags 40,500 + Cosmics 11,000 + Jewellery 55,000 = 105,950
 *
 * total_costs      = sum of all expense costs (Rent, PR, Marketing etc)
 *                   e.g. 7,500 + 1,800 = 9,300
 *
 * cost_multiplier  = total_costs / total_buy_amount
 *                   e.g. 9,300 / 105,950 = 0.0878 = 8.78%
 *
 * total_cost_amount = total_buy_amount + total_costs
 *                   e.g. 105,950 + 9,300 = 115,250
 *
 * Per product cost_price = buy_price * (1 + cost_multiplier)
 *   e.g. buy Rs.45 * 1.0878 = Rs.48.95 cost to you (NOT Rs.45)
 *   e.g. buy Rs.20 * 1.0878 = Rs.21.76 cost to you
 */
export async function recalcStock(stockId) {
  const [batches, products, costs] = await Promise.all([
    StockBatch.find({ stock_id: stockId }),
    Product.find({ stock_id: stockId }),
    Cost.find({ stock_id: stockId }),
  ])

  // total_buy_amount = sum of batch buy_amounts (always use buy_amount, not total_with_interest)
  // because interest is already added as a separate Cost entry
  let total_buy_amount = 0
  if (batches.length > 0) {
    // Use buy_amount only — interest is captured separately as a Cost
    total_buy_amount = batches.reduce((s, b) => s + (Number(b.buy_amount) || 0), 0)
  } else {
    // No batches → use sum of product purchases
    total_buy_amount = products.reduce((s, p) => s + (Number(p.total_buy) || 0), 0)
  }

  const total_costs     = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const cost_multiplier = total_buy_amount > 0 ? total_costs / total_buy_amount : 0
  const total_cost_amount = total_buy_amount + total_costs

  await Stock.findByIdAndUpdate(stockId, {
    total_buy_amount,
    total_cost_amount,
    cost_multiplier,
  })

  // Recalculate every product's cost_price with the new multiplier
  for (const p of products) {
    const cost_price         = (Number(p.buy_price) || 0) * (1 + cost_multiplier)
    const regular_price      = Number(p.regular_price)  || 0
    const discount_price     = Number(p.discount_price) || 0

    const profit_on_regular  = cost_price > 0 && regular_price  > 0
      ? ((regular_price  - cost_price) / cost_price) * 100 : 0
    const profit_on_discount = cost_price > 0 && discount_price > 0
      ? ((discount_price - cost_price) / cost_price) * 100 : 0

    // Effective cost = stock cost + expected marketing + expected cod returns
    const mktPct    = (Number(p.expected_marketing_pct)  || 0) / 100
    const codRetPct = (Number(p.expected_cod_return_pct) || 0) / 100
    const codCharge = Number(p.cod_charge_per_order) || 0
    const sell      = discount_price || regular_price || 0
    const effective_cost_price = cost_price + sell * mktPct + sell * codRetPct + codCharge

    await Product.findByIdAndUpdate(p._id, {
      cost_price,
      profit_on_regular,
      profit_on_discount,
      effective_cost_price,
    })
  }

  return Stock.findById(stockId)
}
