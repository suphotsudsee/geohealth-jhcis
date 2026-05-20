import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { MarkerData } from '@/types/api'

export const runtime = 'nodejs'

const THAILAND_BOUNDS = {
  minLat: 5,
  maxLat: 21,
  minLng: 97,
  maxLng: 106,
}

function isValidThaiCoordinate(lat: number, lng: number) {
  return (
    lat >= THAILAND_BOUNDS.minLat &&
    lat <= THAILAND_BOUNDS.maxLat &&
    lng >= THAILAND_BOUNDS.minLng &&
    lng <= THAILAND_BOUNDS.maxLng
  )
}

function normalizeCoordinate(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) return null
  if (isValidThaiCoordinate(lat, lng)) return { lat, lng }
  if (isValidThaiCoordinate(lng, lat)) return { lat: lng, lng: lat }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const villageId = searchParams.get('villageId')

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

    const patientMarkers: MarkerData[] = patients.flatMap((patient) => {
      const coord = normalizeCoordinate(patient.lat, patient.lng)
      if (!coord) return []

      return [{
        id: patient.id,
        lat: coord.lat,
        lng: coord.lng,
        type: 'patient' as const,
        riskLevel: patient.riskLevel,
        label: patient.fullName,
        popupData: {
          cid: patient.cid,
          age: patient.age,
          gender: patient.gender,
          chronicDisease: patient.chronicDisease,
          bedridden: patient.bedridden,
          houseNo: patient.house?.houseNo,
          villageName: patient.house?.village?.name,
        },
      }]
    })

    const existingPatientHouseNos = new Set(patients.filter((patient) => patient.house).map((patient) => patient.house?.houseNo))
    const houseMarkers: MarkerData[] = houses
      .filter((house) => !existingPatientHouseNos.has(house.houseNo))
      .flatMap((house) => {
        const coord = normalizeCoordinate(house.lat, house.lng)
        if (!coord) return []

        return [{
          id: house.id,
          lat: coord.lat,
          lng: coord.lng,
          type: 'house' as const,
          riskLevel: house.riskLevel,
          label: `บ้านเลขที่ ${house.houseNo || ''}`,
          popupData: {
            houseNo: house.houseNo,
            villageName: house.village?.name,
          },
        }]
      })

    return NextResponse.json({ success: true, data: [...patientMarkers, ...houseMarkers] })
  } catch (error) {
    console.error('GET /api/v1/map/markers error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch markers' } },
      { status: 500 }
    )
  }
}
