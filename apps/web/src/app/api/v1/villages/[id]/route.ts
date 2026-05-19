import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    const village = await prisma.village.findUnique({
      where: { id },
      include: {
        subDistrict: {
          include: {
            district: { include: { province: true } },
          },
        },
        _count: { select: { houses: true } },
      },
    })

    if (!village) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Village not found' } },
        { status: 404 }
      )
    }

    // Stats
    const houses = await prisma.house.findMany({
      where: { villageId: id },
      select: { id: true, riskLevel: true, _count: { select: { patients: true } } },
    })

    const totalPopulation = houses.reduce((sum, h) => sum + h._count.patients, 0)
    const totalHouses = houses.length

    const patientRiskCounts = await prisma.patient.groupBy({
      by: ['riskLevel'],
      where: { house: { villageId: id } },
      _count: { id: true },
    })

    const chronicCount = await prisma.chronicRecord.count({
      where: { patient: { house: { villageId: id } }, isActive: true },
    })

    const bedriddenCount = await prisma.patient.count({
      where: { house: { villageId: id }, bedridden: true },
    })

    const stats = {
      totalPopulation,
      totalHouses,
      patientCountByRisk: patientRiskCounts.reduce(
        (acc, r) => {
          acc[r.riskLevel] = r._count.id
          return acc
        },
        {} as Record<string, number>
      ),
      chronicPatientCount: chronicCount,
      bedriddenCount,
    }

    const response: ApiResponse = {
      success: true,
      data: {
        ...village,
        stats,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/villages/[id] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch village details' } },
      { status: 500 }
    )
  }
}
