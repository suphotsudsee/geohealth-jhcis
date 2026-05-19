import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import type { ApiResponse, DashboardStats } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)

    // Build scope for patient/house filtering
    const scopeFilter: Record<string, unknown> = {}
    if (user && user.role !== 'ADMIN') {
      if (user.scope?.village) {
        scopeFilter.house = { village: { code: user.scope.village } }
      } else if (user.scope?.district) {
        scopeFilter.house = { village: { subDistrict: { districtCode: user.scope.district } } }
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const scopePatientWhere = { ...scopeFilter } as any
    const scopeFFCToday = {
      visitDate: { gte: today },
      ...(user?.scope?.village
        ? { house: { village: { code: user.scope.village } } }
        : user?.scope?.district
          ? { house: { village: { subDistrict: { districtCode: user.scope.district } } } }
          : {}),
    }

    const [
      totalPopulation,
      totalChronic,
      totalBedridden,
      totalRisk,
      ffcToday,
      ffcThisMonth,
    ] = await Promise.all([
      prisma.patient.count({ where: scopePatientWhere }),
      prisma.chronicRecord.count({
        where: {
          isActive: true,
          patient: Object.keys(scopeFilter).length > 0 ? scopeFilter : undefined,
        } as any,
      }),
      prisma.patient.count({
        where: {
          bedridden: true,
          ...scopeFilter,
        } as any,
      }),
      prisma.patient.count({
        where: {
          riskLevel: { in: ['CRITICAL', 'HIGH'] },
          ...scopeFilter,
        } as any,
      }),
      (prisma as any).fFCVisit.count({
        where: {
          visitDate: { gte: today },
          ...(Object.keys(scopeFFCToday).length > 0
            ? { house: (scopeFFCToday as any).house || undefined }
            : {}),
        } as any,
      }),
      (prisma as any).fFCVisit.count({
        where: {
          visitDate: { gte: firstOfMonth },
          ...(Object.keys(scopeFFCToday).length > 0
            ? { house: (scopeFFCToday as any).house || undefined }
            : {}),
        } as any,
      }),
    ])

    const stats: DashboardStats = {
      totalPopulation,
      totalChronic,
      totalBedridden,
      totalRisk,
      ffcToday,
      ffcThisMonth,
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
