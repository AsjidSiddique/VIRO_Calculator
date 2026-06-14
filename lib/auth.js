import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'virocalc_secret_2026'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' })
}

export function verifyToken(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (!token) throw new Error('No token')
  return jwt.verify(token, SECRET)
}
