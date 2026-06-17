import mongoose from 'mongoose'

// ── Stock ──────────────────────────────────────────────────────────────────
const StockSchema = new mongoose.Schema({
  stock_name:        { type: String, required: true },
  date_added:        { type: Date,   default: Date.now },
  total_buy_amount:  { type: Number, default: 0 },  // sum of all batch buy amounts
  total_cost_amount: { type: Number, default: 0 },  // total_buy + all expenses
  cost_multiplier:   { type: Number, default: 0 },  // expenses / total_buy
  notes:             String,
  is_active:         { type: Boolean, default: true },
}, { timestamps: true })

// ── StockBatch — sub-purchase entry (Bags 41k, Jewellery 50k etc) ──────────
const StockBatchSchema = new mongoose.Schema({
  stock_id:             { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
  batch_name:           { type: String, required: true },
  category:             { type: String, default: '' }, // Jewellery, Bags, Cosmetics etc
  date_purchased:       { type: Date, default: Date.now },
  buy_amount:           { type: Number, default: 0 },
  interest_rate:        { type: Number, default: 0 },
  interest_amount:      { type: Number, default: 0 },
  total_with_interest:  { type: Number, default: 0 },
  notes:                String,
}, { timestamps: true })

// ── CostPart — a sub-entry inside a cost (e.g. Rent = 350+2500+200+650+3800) ──
const CostPartSchema = new mongoose.Schema({
  label:  { type: String, default: '' },
  amount: { type: Number, default: 0 },
})

// ── Cost — expense against a stock ────────────────────────────────────────
const CostSchema = new mongoose.Schema({
  stock_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
  name:      { type: String, required: true },
  amount:    { type: Number, required: true },  // final total (sum of parts or manual)
  parts:     [CostPartSchema],                  // optional breakdown
  type:      { type: String, enum: ['fixed','per_unit'], default: 'fixed' },
  category:  { type: String, enum: ['Rent','Travelling','Marketing/Ads','Packaging','Salary','Interest','COD Charges','Other'], default: 'Other' },
}, { timestamps: true })

// ── Product ────────────────────────────────────────────────────────────────
const ProductSchema = new mongoose.Schema({
  stock_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
  batch_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'StockBatch', default: null },
  product_code:       { type: String, required: true },
  product_name:       String,
  category:           String,
  buy_price:          { type: Number, required: true },
  quantity_bought:    { type: Number, required: true },
  quantity_sold:      { type: Number, default: 0 },
  total_buy:          Number,
  cost_price:         Number,    // buy_price * (1 + cost_multiplier)
  regular_price:      Number,
  discount_price:     Number,
  profit_on_regular:  Number,
  profit_on_discount: Number,
  // new: expected deductions to factor in before pricing
  expected_marketing_pct:  { type: Number, default: 0 }, // % of sell price for ads
  expected_cod_return_pct: { type: Number, default: 0 }, // % orders expected returned
  cod_charge_per_order:    { type: Number, default: 0 }, // courier fee per order
  effective_cost_price:    Number, // cost_price + marketing + cod deductions per unit
  current_stock:      Number,
  notes:              String,
}, { timestamps: true })

// ── Order ──────────────────────────────────────────────────────────────────
const OrderItemSchema = new mongoose.Schema({
  product_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  product_code: String,
  product_name: String,
  qty:          { type: Number, default: 1 },
  unit_price:   Number,
  cost_price:   Number,
  discount:     { type: Number, default: 0 },
  subtotal:     Number,
  profit:       Number,
})

const OrderSchema = new mongoose.Schema({
  order_number:   { type: String, unique: true },
  customer_name:  { type: String, required: true },
  customer_phone: String,
  date:           { type: Date, default: Date.now },
  stock_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
  items:          [OrderItemSchema],
  subtotal:       { type: Number, default: 0 },
  order_discount: { type: Number, default: 0 },
  discount_pct:   { type: Number, default: 0 },
  total:          { type: Number, default: 0 },
  total_cost:     { type: Number, default: 0 },
  total_profit:   { type: Number, default: 0 },
  payment_method: { type: String, enum: ['COD','JazzCash','EasyPaisa','Cash','Bank','Other'], default: 'COD' },
  status:         { type: String, enum: ['pending','confirmed','processing','shipped','delivered','returned','cancelled'], default: 'pending' },
  notes:          String,
  is_returned:    { type: Boolean, default: false },
  return_loss:    { type: Number, default: 0 },
}, { timestamps: true })

// ── Daily Record ───────────────────────────────────────────────────────────
const SaleItemSchema     = new mongoose.Schema({ product_id:{type:mongoose.Schema.Types.ObjectId,ref:'Product'}, product_code:String, product_name:String, qty_sold:Number, sell_price:Number, cost_price:Number, revenue:Number, profit:Number })
const CodReturnSchema    = new mongoose.Schema({ product_id:{type:mongoose.Schema.Types.ObjectId,ref:'Product'}, product_code:String, qty:Number, loss_amount:Number, reason:String })
const OtherExpenseSchema = new mongoose.Schema({ label:String, amount:Number })

const DailyRecordSchema = new mongoose.Schema({
  date:                 { type: Date, required: true },
  stock_ids:            [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stock' }],
  sales:                [SaleItemSchema],
  cod_returns:          [CodReturnSchema],
  other_expenses:       [OtherExpenseSchema],
  total_revenue:        { type: Number, default: 0 },
  total_profit:         { type: Number, default: 0 },
  total_cost:           { type: Number, default: 0 },
  total_returns_loss:   { type: Number, default: 0 },
  total_other_expenses: { type: Number, default: 0 },
  net_profit:           { type: Number, default: 0 },
  notes:                String,
}, { timestamps: true })

// ── Marketing ──────────────────────────────────────────────────────────────
const MarketingSchema = new mongoose.Schema({
  stock_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
  cost_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'Cost', default: null }, // linked cost entry on stock
  platform:          { type: String, enum: ['Facebook','TikTok','Google','Instagram','Other'], required: true },
  campaign_name:     String,

  // Phase 1 — Before campaign
  estimated_budget:  { type: Number, default: 0 }, // what you plan to spend
  add_to_stock_cost: { type: Boolean, default: false }, // true = added as cost on stock

  // Phase 2 — After campaign (fill in after running)
  actual_budget:     { type: Number, default: 0 }, // what you actually spent
  actual_orders:     { type: Number, default: 0 },
  actual_revenue:    { type: Number, default: 0 },
  expected_orders:   Number,

  // Calculated
  budget:            { type: Number, default: 0 }, // = actual_budget if set, else estimated_budget
  cost_per_order:    { type: Number, default: null },
  roas:              { type: Number, default: null },

  status:  { type: String, enum: ['planned','running','completed'], default: 'planned' },
  date:    { type: Date, default: Date.now },
  notes:   String,
}, { timestamps: true })

// ── StockMovement — tracks every sold/add event with date ─────────────────
const StockMovementSchema = new mongoose.Schema({
  product_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  stock_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Stock' },
  type:         { type: String, enum: ['sold', 'add', 'return'], required: true },
  qty:          { type: Number, required: true },
  date:         { type: Date, default: Date.now },
  note:         { type: String, default: '' },
  stock_before: { type: Number, default: 0 },
  stock_after:  { type: Number, default: 0 },
}, { timestamps: true })

export const Stock         = mongoose.models.Stock         || mongoose.model('Stock',         StockSchema)
export const StockBatch    = mongoose.models.StockBatch    || mongoose.model('StockBatch',    StockBatchSchema)
export const Product       = mongoose.models.Product       || mongoose.model('Product',       ProductSchema)
export const Cost          = mongoose.models.Cost          || mongoose.model('Cost',          CostSchema)
export const Order         = mongoose.models.Order         || mongoose.model('Order',         OrderSchema)
export const DailyRecord   = mongoose.models.DailyRecord   || mongoose.model('DailyRecord',   DailyRecordSchema)
export const Marketing     = mongoose.models.Marketing     || mongoose.model('Marketing',     MarketingSchema)
export const StockMovement = mongoose.models.StockMovement || mongoose.model('StockMovement', StockMovementSchema)
