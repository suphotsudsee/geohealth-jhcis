import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import { PAGINATION_DEFAULTS, RISK_LEVELS } from '@/lib/constants'
import type { ApiResponse, PatientSummary, Pagination } from '@/types/api'

export const runtime = 'nodejs'

function buildScopeFilter(user: { role: string; scope?: { village?: string; district?: string; province?: string } } | null) {
  if (!user) return {}
  if (user.role === 'ADMIN') return {}
  if (user.scope?.village) {
    return { house: { village: { code: user.scope.village } } }
  }
  if (user.scope?.district) {
    return { house: { village: { subDistrict: { districtCode: user.scope.district } } } }
  }
  return {}
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || String(PAGINATION_DEFAULTS.page)))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION_DEFAULTS.limit))))
    const riskLevel = searchParams.get('riskLevel')
    const chronicCode = searchParams.get('chronicCode')
    const villageId = searchParams.get('villageId')
    const ageMin = searchParams.get('ageMin')
    const ageMax = searchParams.get('ageMax')
    const gender = searchParams.get('gender')
    const sort = searchParams.get('sort') || 'updatedAt'
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

    const allowedSortFields = ['fullName', 'age', 'updatedAt', 'createdAt', 'riskLevel']
    const sortField = allowedSortFields.includes(sort) ? sort : 'updatedAt'

    const where: Record<string, unknown> = {
      ...buildScopeFilter(user),
    }

    if (riskLevel && RISK_LEVELS.includes(riskLevel as typeof RISK_LEVELS[number])) {
      where.riskLevel = riskLevel
    }

    if (chronicCode) {
      where.chronicRecords = { some: { diseaseCode: chronicCode } }
    }

    if (villageId) {
      where.house = { ...(where.house as Record<string, unknown> || {}), villageId }
    }

    if (ageMin || ageMax) {
      const ageFilter: Record<string, number> = {}
      if (ageMin) ageFilter.gte = parseInt(ageMin)
      if (ageMax) ageFilter.lte = parseInt(ageMax)
      where.age = ageFilter
    }

    if (gender && ['MALE', 'FEMALE', 'UNKNOWN'].includes(gender)) {
      where.gender = gender
    }

    const skip = (page - 1) * limit

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where: where as any }),
      prisma.patient.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortField]: order },
        include: {
          house: {
            include: {
              village: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
    ])

    const data: PatientSummary[] = patients.map((p) => ({
      id: p.id,
      cid: p.cid,
      hn: p.hn,
      fullName: p.fullName,
      age: p.age,
      gender: p.gender,
      riskLevel: p.riskLevel,
      lat: p.lat,
      lng: p.lng,
      house: p.house
        ? {
            houseNo: p.house.houseNo,
            village: p.house.village
              ? { id: p.house.village.id, name: p.house.village.name }
              : undefined,
          }
        : null,
    }))

    const pagination: Pagination = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }

    const response: ApiResponse<PatientSummary[]> = {
      success: true,
      data,
      pagination,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/patients error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch patients' } },
      { status: 500 }
    )
  }
}
