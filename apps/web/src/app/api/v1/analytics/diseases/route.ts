import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const grouped = await prisma.chronicRecord.groupBy({
      by: ['diseaseCode', 'diseaseName'],
      where: { isActive: true },
      _count: { _all: true },
      orderBy: { _count: { diseaseCode: 'desc' } },
      take: 12,
    })

    const data = grouped.map((item) => ({
      name: item.diseaseCode || item.diseaseName,
      label: item.diseaseName,
      count: item._count._all,
    }))

    const response: ApiResponse<typeof data> = {
      success: true,
      data,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/analytics/diseases error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch disease stats' } },
      { status: 500 }
    )
  }
}
