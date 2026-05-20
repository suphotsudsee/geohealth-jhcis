import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import type { ApiResponse, DashboardStats } from '@/types/api'

export const runtime = 'nodejs'

function getScopedPatientWhere(user: ReturnType<typeof getUserFromRequest>): Prisma.PatientWhereInput {
  if (!user || user.role === 'ADMIN') return {}

  if (user.scope?.village) {
    return {
      house: {
        is: {
          village: {
            is: { code: user.scope.village },
          },
        },
      },
    }
  }

  if (user.scope?.district) {
    return {
      house: {
        is: {
          village: {
            is: {
              subDistrict: {
                is: { districtCode: user.scope.district },
              },
            },
          },
        },
      },
    }
  }

  return {}
}

function getScopedFFCVisitWhere(user: ReturnType<typeof getUserFromRequest>): Prisma.FFCVisitWhereInput {
  const patientWhere = getScopedPatientWhere(user)
  return Object.keys(patientWhere).length > 0 ? { patient: { is: patientWhere } } : {}
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    const scopePatientWhere = getScopedPatientWhere(user)
    const scopeFFCVisitWhere = getScopedFFCVisitWhere(user)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const [
      totalPopulation,
      totalChronic,
      totalBedridden,
      totalRisk,
      ffcToday,
      ffcThisMonth,
      coveredVillages,
      totalVillages,
    ] = await Promise.all([
      prisma.patient.count({ where: scopePatientWhere }),
      prisma.chronicRecord.count({
        where: {
          isActive: true,
          patient: Object.keys(scopePatientWhere).length > 0 ? { is: scopePatientWhere } : undefined,
        },
      }),
      prisma.patient.count({
        where: {
          bedridden: true,
          ...scopePatientWhere,
        },
      }),
      prisma.patient.count({
        where: {
          riskLevel: { in: ['CRITICAL', 'HIGH'] },
          ...scopePatientWhere,
        },
      }),
      prisma.fFCVisit.count({
        where: {
          visitDate: { gte: today },
          ...scopeFFCVisitWhere,
        },
      }),
      prisma.fFCVisit.count({
        where: {
          visitDate: { gte: firstOfMonth },
          ...scopeFFCVisitWhere,
        },
      }),
      prisma.village.count({ where: { houses: { some: {} } } }),
      prisma.village.count(),
    ])

    const stats: DashboardStats = {
      totalPopulation,
      totalChronic,
      totalBedridden,
      totalRisk,
      ffcToday,
      ffcThisMonth,
      coveredVillages,
      totalVillages,
    }

    const response: ApiResponse<DashboardStats> = {
      success: true,
      data: stats,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/analytics/dashboard error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard stats' } },
      { status: 500 }
    )
  }
}
