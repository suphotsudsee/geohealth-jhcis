import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { HeatmapPoint } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const disease = searchParams.get('disease')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Get patients with location data that match the disease filter
    const where: Record<string, unknown> = {
      lat: { not: null },
      lng: { not: null },
    }

    if (disease) {
      where.chronicRecords = {
        some: {
          diseaseCode: disease,
          isActive: true,
        },
      }
    }

    const patients = await prisma.patient.findMany({
      where: where as any,
      select: {
        lat: true,
        lng: true,
        chronicRecords: {
          where: disease ? { diseaseCode: disease, isActive: true } : { isActive: true },
          select: { diseaseCode: true },
        },
        visitRecords: dateFrom || dateTo
          ? {
              where: {
                ...(dateFrom ? { visitDate: { gte: new Date(dateFrom) } } : {}),
                ...(dateTo ? { visitDate: { lte: new Date(dateTo) } } : {}),
              },
              select: { id: true },
            }
          : false,
      },
    })

    // Group by lat/lng grid (rounded to 2 decimal places ≈ ~1.1km grid)
    const gridMap = new Map<string, { lat: number; lng: number; count: number }>()

    for (const p of patients) {
      if (p.lat === null || p.lng === null) continue

      const gridLat = Math.round(p.lat * 100) / 100
      const gridLng = Math.round(p.lng * 100) / 100
      const key = `${gridLat},${gridLng}`

      const existing = gridMap.get(key)
      if (existing) {
        existing.count++
      } else {
        gridMap.set(key, { lat: gridLat, lng: gridLng, count: 1 })
      }
    }

    const data: HeatmapPoint[] = Array.from(gridMap.values()).map((g) => ({
      lat: g.lat,
      lng: g.lng,
      intensity: Math.min(g.count / 10, 1), // normalize intensity (10+ patients = 1.0)
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/v1/map/heatmap error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch heatmap data' } },
      { status: 500 }
    )
  }
}
