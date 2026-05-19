import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import { PAGINATION_DEFAULTS, RISK_LEVELS } from '@/lib/constants'
import type { ApiResponse, Pagination } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || String(PAGINATION_DEFAULTS.page)))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION_DEFAULTS.limit))))
    const villageId = searchParams.get('villageId')
    const riskLevel = searchParams.get('riskLevel')

    const where: Record<string, unknown> = {}

    if (villageId) {
      where.villageId = villageId
    }

    if (riskLevel && RISK_LEVELS.includes(riskLevel as typeof RISK_LEVELS[number])) {
      where.riskLevel = riskLevel
    }

    // Scope filter
    if (user && user.role !== 'ADMIN') {
      if (user.scope?.village) {
        where.village = { code: user.scope.village }
      } else if (user.scope?.district) {
        where.village = { subDistrict: { districtCode: user.scope.district } }
      }
    }

    const skip = (page - 1) * limit

    const [total, houses] = await Promise.all([
      prisma.house.count({ where: where as any }),
      prisma.house.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          village: { select: { id: true, name: true, code: true, moo: true } },
          _count: { select: { patients: true } },
        },
      }),
    ])

    const pagination: Pagination = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }

    const response: ApiResponse = {
      success: true,
      data: houses,
      pagination,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/houses error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch houses' } },
      { status: 500 }
    )
  }
}
