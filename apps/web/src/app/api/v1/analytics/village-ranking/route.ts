import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'chronic' // chronic, risk, bedridden, population
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))

    const villages = await prisma.village.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        moo: true,
        _count: { select: { houses: true } },
          subDistrict: {
            select: {
              nameTh: true,
              nameEn: true,
              district: {
                select: {
                  nameTh: true,
                  nameEn: true,
                  province: { select: { nameTh: true, nameEn: true } },
                },
              },
            },
          },
      },
      orderBy: { name: 'asc' },
    })

    // Build stats for each village
    const villageStats = await Promise.all(
      villages.map(async (v) => {
        const [totalPopulation, chronicCount, riskCount, bedriddenCount] = await Promise.all([
          prisma.patient.count({ where: { house: { villageId: v.id } } }),
          prisma.chronicRecord.count({
            where: { isActive: true, patient: { house: { villageId: v.id } } },
          }),
          prisma.patient.count({
            where: { house: { villageId: v.id }, riskLevel: { in: ['CRITICAL', 'HIGH'] } },
          }),
          prisma.patient.count({
            where: { house: { villageId: v.id }, bedridden: true },
          }),
        ])

        return {
          villageId: v.id,
          villageCode: v.code,
          villageName: v.name,
          moo: v.moo,
          subDistrict: v.subDistrict?.nameTh ?? v.subDistrict?.nameEn ?? 'N/A',
          district: v.subDistrict?.district?.nameTh ?? v.subDistrict?.district?.nameEn ?? 'N/A',
          province: v.subDistrict?.district?.province?.nameTh ?? v.subDistrict?.district?.province?.nameEn ?? 'N/A',
          totalHouses: v._count.houses,
          totalPopulation,
          chronicCount,
          riskCount,
          bedriddenCount,
        }
      })
    )

    // Sort by selected metric
    let sorted: typeof villageStats
    switch (metric) {
      case 'chronic':
        sorted = villageStats.sort((a, b) => b.chronicCount - a.chronicCount)
        break
      case 'risk':
        sorted = villageStats.sort((a, b) => b.riskCount - a.riskCount)
        break
      case 'bedridden':
        sorted = villageStats.sort((a, b) => b.bedriddenCount - a.bedriddenCount)
        break
      case 'population':
        sorted = villageStats.sort((a, b) => b.totalPopulation - a.totalPopulation)
        break
      default:
        sorted = villageStats.sort((a, b) => b.chronicCount - a.chronicCount)
    }

    const top = sorted.slice(0, limit).map((v, i) => ({
      rank: i + 1,
      ...v,
    }))

    const response: ApiResponse = {
      success: true,
      data: {
        metric,
        ranking: top,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/analytics/village-ranking error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch village ranking' } },
      { status: 500 }
    )
  }
}
