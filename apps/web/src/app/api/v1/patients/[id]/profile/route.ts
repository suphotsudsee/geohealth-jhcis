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

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        house: {
          include: {
            village: { select: { id: true, name: true, code: true, moo: true } },
          },
        },
        chronicRecords: {
          orderBy: { diagnosedDate: 'desc' },
          where: { isActive: true },
        },
        visitRecords: {
          orderBy: { visitDate: 'desc' },
          take: 5,
          select: {
            id: true,
            visitDate: true,
            diagnosisName: true,
            hospitalCode: true,
            visitType: true,
          },
        },
        labResults: {
          orderBy: { labDate: 'desc' },
          take: 10,
          select: {
            id: true,
            labDate: true,
            labName: true,
            result: true,
            unit: true,
            normalRange: true,
            abnormal: true,
          },
        },
        drugRecords: {
          orderBy: { startDate: 'desc' },
          take: 10,
          select: {
            id: true,
            drugName: true,
            dosage: true,
            frequency: true,
            startDate: true,
            endDate: true,
          },
        },
        ffcVisits: {
          orderBy: { visitDate: 'desc' },
          take: 5,
          include: {
            user: { select: { id: true, displayName: true } },
          },
        },
      },
    })

    if (!patient) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Patient not found' } },
        { status: 404 }
      )
    }

    const profile = {
      id: patient.id,
      cid: patient.cid,
      hn: patient.hn,
      fullName: patient.fullName,
      firstName: patient.firstName,
      lastName: patient.lastName,
      birthDate: patient.birthDate,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      riskLevel: patient.riskLevel,
      chronicDisease: patient.chronicDisease,
      drugAllergy: patient.drugAllergy,
      disability: patient.disability,
      bedridden: patient.bedridden,
      imageUrl: patient.imageUrl,
      lat: patient.lat,
      lng: patient.lng,
      house: patient.house,
      chronicRecords: patient.chronicRecords,
      recentVisits: patient.visitRecords,
      recentLabs: patient.labResults,
      currentDrugs: patient.drugRecords,
      recentFfcVisits: patient.ffcVisits,
      lastSyncAt: patient.lastSyncAt,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    }

    const response: ApiResponse = {
      success: true,
      data: profile,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/patients/[id]/profile error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch patient profile' } },
      { status: 500 }
    )
  }
}
