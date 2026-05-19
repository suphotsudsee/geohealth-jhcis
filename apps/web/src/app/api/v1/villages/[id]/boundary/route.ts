import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { ApiResponse, VillageBoundary } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    // Check village exists
    const village = await prisma.village.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!village) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Village not found' } },
        { status: 404 }
      )
    }

    // Raw SQL with ST_AsGeoJSON for MySQL spatial
    const result = await prisma.$queryRaw<Array<{ geojson: string }>>`
      SELECT ST_AsGeoJSON(boundary) as geojson
      FROM Village
      WHERE id = ${id}
        AND boundary IS NOT NULL
      LIMIT 1
    `

    if (!result || result.length === 0 || !result[0].geojson) {
      return NextResponse.json(
        { success: true, data: { type: 'FeatureCollection', features: [] } satisfies VillageBoundary }
      )
    }

    let geometry: Record<string, unknown>
    try {
      geometry = JSON.parse(result[0].geojson)
    } catch {
      return NextResponse.json(
        { success: true, data: { type: 'FeatureCollection', features: [] } satisfies VillageBoundary }
      )
    }

    const boundary: VillageBoundary = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: village.id, name: village.name },
          geometry: geometry as { type: string; coordinates: unknown },
        },
      ],
    }

    const response: ApiResponse<VillageBoundary> = {
      success: true,
      data: boundary,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/villages/[id]/boundary error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch boundary' } },
      { status: 500 }
    )
  }
}
