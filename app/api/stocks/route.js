import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { Stock } from '@/models'

export async function GET(req) {
  try {
    verifyToken(req)
    await connectDB()
    const stocks = await Stock.find().sort({ date_added: -1 })
    return NextResponse.json(stocks)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'No token' ? 401 : 500 })
  }
}

export async function POST(req) {
  try {
    verifyToken(req)
    await connectDB()
    const body = await req.json()
    const stock = await Stock.create(body)
    return NextResponse.json(stock)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
