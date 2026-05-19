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
            village: {
              include: {
                subDistrict: {
                  include: { district: { include: { province: true } } },
                },
              },
            },
          },
        },
        chronicRecords: { orderBy: { diagnosedDate: 'desc' } },
        visitRecords: { orderBy: { visitDate: 'desc' }, take: 20 },
        labResults: { orderBy: { labDate: 'desc' }, take: 20 },
        drugRecords: { orderBy: { startDate: 'desc' } },
        ffcVisits: {
          orderBy: { visitDate: 'desc' },
          take: 10,
          include: { user: { select: { id: true, displayName: true } } },
        },
      },
    })

    if (!patient) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Patient not found' } },
        { status: 404 }
      )
    }

    const response: ApiResponse = {
      success: true,
      data: patient,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/patients/[id] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch patient' } },
      { status: 500 }
    )
  }
}
