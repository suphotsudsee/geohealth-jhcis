import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { ApiResponse, PatientSummary } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')
    const radius = parseFloat(searchParams.get('radius') || '500') // default 500m

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'lat and lng are required' } },
        { status: 400 }
      )
    }

    // MySQL ST_Distance_Sphere returns distance in meters
    const patients = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        p.id, p.cid, p.hn, p.fullName, p.age, p.gender, p.riskLevel,
        p.lat, p.lng, p.houseId,
        h.houseNo,
        v.id as villageId, v.name as villageName,
        ST_Distance_Sphere(
          POINT(${lng}, ${lat}),
          POINT(p.lng, p.lat)
        ) as distance
      FROM Patient p
      LEFT JOIN House h ON h.id = p.houseId
      LEFT JOIN Village v ON v.id = h.villageId
      WHERE p.lat IS NOT NULL
        AND p.lng IS NOT NULL
        AND ST_Distance_Sphere(
          POINT(${lng}, ${lat}),
          POINT(p.lng, p.lat)
        ) <= ${radius}
      ORDER BY distance ASC
      LIMIT 100
    `

    const data: (PatientSummary & { distance: number })[] = (patients as any[]).map((p) => ({
      id: p.id as string,
      cid: p.cid as string | null,
      hn: p.hn as string | null,
      fullName: p.fullName as string,
      age: p.age as number | null,
      gender: p.gender as any,
      riskLevel: p.riskLevel as any,
      lat: p.lat as number | null,
      lng: p.lng as number | null,
      distance: Number(p.distance),
      house: p.houseId
        ? {
            houseNo: p.houseNo as string | null,
            village: { id: p.villageId as string, name: p.villageName as string },
          }
        : null,
    }))

    const response: ApiResponse = {
      success: true,
      data,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/patients/nearby error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to find nearby patients' } },
      { status: 500 }
    )
  }
}
