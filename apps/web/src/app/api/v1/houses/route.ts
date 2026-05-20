import { NextRequest, NextResponse } from 'next/server'
import { RiskLevel } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import { PAGINATION_DEFAULTS, RISK_LEVELS } from '@/lib/constants'
import type { ApiResponse, Pagination } from '@/types/api'

export const runtime = 'nodejs'

const THAILAND_BOUNDS = {
  minLat: 5,
  maxLat: 21,
  minLng: 97,
  maxLng: 106,
}

function isValidThaiCoordinate(lat: number, lng: number) {
  return (
    lat >= THAILAND_BOUNDS.minLat &&
    lat <= THAILAND_BOUNDS.maxLat &&
    lng >= THAILAND_BOUNDS.minLng &&
    lng <= THAILAND_BOUNDS.maxLng
  )
}

function normalizeCoordinate(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) return { lat, lng }
  if (isValidThaiCoordinate(lat, lng)) return { lat, lng }
  if (isValidThaiCoordinate(lng, lat)) return { lat: lng, lng: lat }
  return { lat: null, lng: null }
}

function getScopedHouseWhere(user: ReturnType<typeof getUserFromRequest>): Prisma.HouseWhereInput {
  if (!user || user.role === 'ADMIN') return {}

  if (user.scope?.village) {
    return {
      village: {
        is: { code: user.scope.village },
      },
    }
  }

  if (user.scope?.district) {
    return {
      village: {
        is: {
          subDistrict: {
            is: { districtCode: user.scope.district },
          },
        },
      },
    }
  }

  return {}
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || String(PAGINATION_DEFAULTS.page)))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION_DEFAULTS.limit))))
    const villageId = searchParams.get('villageId')
    const riskLevel = searchParams.get('riskLevel')
    const search = searchParams.get('search')?.trim()

    const where: Prisma.HouseWhereInput = {
      ...getScopedHouseWhere(user),
    }

    if (villageId) {
      where.villageId = villageId
    }

    if (riskLevel && RISK_LEVELS.includes(riskLevel as typeof RISK_LEVELS[number])) {
      where.riskLevel = riskLevel as RiskLevel
    }

    if (search) {
      where.OR = [
        { houseNo: { contains: search } },
        { address: { contains: search } },
        { village: { is: { name: { contains: search } } } },
        { village: { is: { code: { contains: search } } } },
      ]
    }

    const skip = (page - 1) * limit

    const [total, houses] = await Promise.all([
      prisma.house.count({ where }),
      prisma.house.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          village: { select: { id: true, name: true, code: true, moo: true } },
          _count: { select: { patients: true } },
        },
      }),
    ])

    const normalizedHouses = houses.map((house) => {
      const coord = normalizeCoordinate(house.lat, house.lng)
      return {
        ...house,
        lat: coord.lat,
        lng: coord.lng,
      }
    })

    const pagination: Pagination = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }

    const response: ApiResponse = {
      success: true,
      data: normalizedHouses,
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
