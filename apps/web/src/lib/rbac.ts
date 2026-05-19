import { Role } from '@prisma/client'
import { NextRequest } from 'next/server'
import { verifyToken, JWTPayload } from './auth'

export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value
  if (!token) return null
  return verifyToken(token)
}

export function requireRole(payload: JWTPayload | null, allowedRoles: string[]): boolean {
  if (!payload) return false
  return allowedRoles.includes(payload.role)
}

export function hasScopeAccess(payload: JWTPayload, targetVillage?: string, targetDistrict?: string): boolean {
  if (payload.role === 'ADMIN') return true
  if (payload.scope?.district && targetDistrict) {
    return payload.scope.district === targetDistrict
  }
  if (payload.scope?.village && targetVillage) {
    return payload.scope.village === targetVillage
  }
  return true
}
