import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const districtCode = searchParams.get('districtCode')

    const where: Record<string, unknown> = {}
    if (districtCode) {
      where.subDistrict = { districtCode }
    }

    const villages = await prisma.village.findMany({
      where: where as any,
      orderBy: [{ moo: 'asc' }, { name: 'asc' }],
      include: {
        subDistrict: {
          select: {
            code: true,
            nameTh: true,
            district: { select: { code: true, nameTh: true } },
          },
        },
        _count: { select: { houses: true } },
      },
    })

    const response: ApiResponse = { success: true, data: villages }
    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/villages error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch villages' } },
      { status: 500 }
    )
  }
}
