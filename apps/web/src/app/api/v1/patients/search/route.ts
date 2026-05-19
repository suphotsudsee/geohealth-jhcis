import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import type { ApiResponse, PatientSummary } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    if (!q) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_QUERY', message: 'Search query is required' } },
        { status: 400 }
      )
    }

    // Scope filter
    const scopeFilter: Record<string, unknown> = {}
    if (user && user.role !== 'ADMIN') {
      if (user.scope?.village) {
        scopeFilter.house = { village: { code: user.scope.village } }
      } else if (user.scope?.district) {
        scopeFilter.house = { village: { subDistrict: { districtCode: user.scope.district } } }
      }
    }

    const isCID = /^\d{13}$/.test(q)

    if (isCID) {
      const patient = await prisma.patient.findUnique({
        where: { cid: q },
        include: {
          house: {
            include: {
              village: { select: { id: true, name: true, code: true } },
            },
          },
        },
      })

      if (!patient) {
        return NextResponse.json({ success: true, data: [] })
      }

      const data: PatientSummary = {
        id: patient.id,
        cid: patient.cid,
        hn: patient.hn,
        fullName: patient.fullName,
        age: patient.age,
        gender: patient.gender,
        riskLevel: patient.riskLevel,
        lat: patient.lat,
        lng: patient.lng,
        house: patient.house
          ? {
              houseNo: patient.house.houseNo,
              village: patient.house.village
                ? { name: patient.house.village.name }
                : undefined,
            }
          : null,
      }

      return NextResponse.json({ success: true, data: [data] })
    }

    // Full name search
    const patients = await prisma.patient.findMany({
      where: {
        fullName: { contains: q, mode: 'insensitive' },
        ...scopeFilter,
      } as any,
      take: 20,
      orderBy: { updatedAt: 'desc' },
      include: {
        house: {
          include: {
            village: { select: { id: true, name: true, code: true } },
          },
        },
      },
    })

    const data: PatientSummary[] = patients.map((p) => ({
      id: p.id,
      cid: p.cid,
      hn: p.hn,
      fullName: p.fullName,
      age: p.age,
      gender: p.gender,
      riskLevel: p.riskLevel,
      lat: p.lat,
      lng: p.lng,
      house: p.house
        ? {
            houseNo: p.house.houseNo,
            village: p.house.village
              ? { name: p.house.village.name }
              : undefined,
          }
        : null,
    }))

    const response: ApiResponse<PatientSummary[]> = {
      success: true,
      data,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/patients/search error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Search failed' } },
      { status: 500 }
    )
  }
}
