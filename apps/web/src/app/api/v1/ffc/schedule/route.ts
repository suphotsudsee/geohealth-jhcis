import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    // Get today's date range (start of day to end of day)
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const visits = await prisma.fFCVisit.findMany({
      where: {
        userId: user.userId,
        visitDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['PLANNED', 'IN_PROGRESS'],
        },
      },
      orderBy: [
        { status: 'asc' }, // PLANNED first, then IN_PROGRESS
        { visitDate: 'asc' },
      ],
      include: {
        patient: {
          select: {
            id: true,
            cid: true,
            hn: true,
            fullName: true,
            age: true,
            gender: true,
            riskLevel: true,
            lat: true,
            lng: true,
            phone: true,
          },
        },
        house: {
          select: {
            id: true,
            houseNo: true,
            moo: true,
            address: true,
            lat: true,
            lng: true,
            village: { select: { id: true, name: true, code: true } },
          },
        },
      },
    })

    const response: ApiResponse = {
      success: true,
      data: visits,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/ffc/schedule error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch schedule' } },
      { status: 500 }
    )
  }
}
