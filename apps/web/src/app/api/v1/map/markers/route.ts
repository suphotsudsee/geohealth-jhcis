import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { MarkerData } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const villageId = searchParams.get('villageId')

    // Bounding box: sw_lat, sw_lng, ne_lat, ne_lng
    const swLat = searchParams.get('sw_lat')
    const swLng = searchParams.get('sw_lng')
    const neLat = searchParams.get('ne_lat')
    const neLng = searchParams.get('ne_lng')

    const patientWhere: Record<string, unknown> = {
      lat: { not: null },
      lng: { not: null },
    }

    if (villageId) {
      patientWhere.house = { villageId }
    }

    // Bounding box filter
    if (swLat && swLng && neLat && neLng) {
      const parsedSwLat = parseFloat(swLat)
      const parsedSwLng = parseFloat(swLng)
      const parsedNeLat = parseFloat(neLat)
      const parsedNeLng = parseFloat(neLng)

      if (!isNaN(parsedSwLat) && !isNaN(parsedSwLng) && !isNaN(parsedNeLat) && !isNaN(parsedNeLng)) {
        patientWhere.lat = { gte: Math.min(parsedSwLat, parsedNeLat), lte: Math.max(parsedSwLat, parsedNeLat) }
        patientWhere.lng = { gte: Math.min(parsedSwLng, parsedNeLng), lte: Math.max(parsedSwLng, parsedNeLng) }
      }
    }

    const patients = await prisma.patient.findMany({
      where: patientWhere as any,
      select: {
        id: true,
        lat: true,
        lng: true,
        riskLevel: true,
        fullName: true,
        cid: true,
        age: true,
        gender: true,
        chronicDisease: true,
        bedridden: true,
        house: {
          select: {
            houseNo: true,
            village: { select: { name: true } },
          },
        },
      },
      take: 10000,
    })

    // Also include houses without patients at their location
    const houseWhere: Record<string, unknown> = {
      lat: { not: null },
      lng: { not: null },
    }
    if (villageId) {
      houseWhere.villageId = villageId
    }
    if (swLat && swLng && neLat && neLng) {
      const parsedSwLat = parseFloat(swLat)
      const parsedSwLng = parseFloat(swLng)
      const parsedNeLat = parseFloat(neLat)
      const parsedNeLng = parseFloat(neLng)
      if (!isNaN(parsedSwLat) && !isNaN(parsedSwLng) && !isNaN(parsedNeLat) && !isNaN(parsedNeLng)) {
        houseWhere.lat = { gte: Math.min(parsedSwLat, parsedNeLat), lte: Math.max(parsedSwLat, parsedNeLat) }
        houseWhere.lng = { gte: Math.min(parsedSwLng, parsedNeLng), lte: Math.max(parsedSwLng, parsedNeLng) }
      }
    }

    const houses = await prisma.house.findMany({
      where: houseWhere as any,
      select: {
        id: true,
        lat: true,
        lng: true,
        riskLevel: true,
        houseNo: true,
        village: { select: { name: true } },
      },
      take: 10000,
    })

    // Patient markers
    const patientMarkers: MarkerData[] = patients.map((p) => ({
      id: p.id,
      lat: p.lat!,
      lng: p.lng!,
      type: 'patient' as const,
      riskLevel: p.riskLevel,
      label: p.fullName,
      popupData: {
        cid: p.cid,
        age: p.age,
        gender: p.gender,
        chronicDisease: p.chronicDisease,
        bedridden: p.bedridden,
        houseNo: p.house?.houseNo,
        villageName: p.house?.village?.name,
      },
    }))

    // House markers (houses without lat/lng already covered by patients)
    const existingPatientHouseIds = new Set(patients.filter(p => p.house).map(p => p.house?.houseNo))
    const houseMarkers: MarkerData[] = houses
      .filter((h) => !existingPatientHouseIds.has(h.houseNo))
      .map((h) => ({
        id: h.id,
        lat: h.lat!,
        lng: h.lng!,
        type: 'house' as const,
        riskLevel: h.riskLevel,
        label: `บ้านเลขที่ ${h.houseNo || ''}`,
        popupData: {
          houseNo: h.houseNo,
          villageName: h.village?.name,
        },
      }))

    const markers = [...patientMarkers, ...houseMarkers]

    return NextResponse.json({ success: true, data: markers })
  } catch (error) {
    console.error('GET /api/v1/map/markers error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch markers' } },
      { status: 500 }
    )
  }
}
