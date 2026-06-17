import { NextResponse } from 'next/server'
import { signToken } from '@/lib/auth'

// ── Edit your login here ──────────────────────────
const USERNAME = 'asjid'
const PASSWORD = 'viro2024'
// ─────────────────────────────────────────────────

export async function POST(req) {
  try {
    const { username, password } = await req.json()
    if (username !== USERNAME || password !== PASSWORD) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    const token = signToken({ username })
    return NextResponse.json({ token })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
