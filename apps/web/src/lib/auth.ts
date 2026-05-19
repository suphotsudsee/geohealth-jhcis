import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'
const ACCESS_TOKEN_TTL = '24h'
const REFRESH_TOKEN_TTL = '7d'

export interface JWTPayload {
  userId: string
  role: string
  scope?: {
    village?: string
    district?: string
    province?: string
  }
}

export function generateTokens(user: { id: string; role: string; villageCode?: string | null; districtCode?: string | null }) {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role, scope: { village: user.villageCode, district: user.districtCode } },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  )

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  )

  return { accessToken, refreshToken }
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
