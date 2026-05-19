import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import { RISK_LEVELS } from '@/lib/constants'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    const house = await prisma.house.findUnique({
      where: { id },
      include: {
        village: {
          include: {
            subDistrict: {
              include: { district: { include: { province: true } } },
            },
          },
        },
        patients: {
          orderBy: { fullName: 'asc' },
          select: {
            id: true,
            cid: true,
            hn: true,
            fullName: true,
            age: true,
            gender: true,
            riskLevel: true,
            chronicDisease: true,
            bedridden: true,
            disability: true,
            phone: true,
          },
        },
        ffcVisits: {
          orderBy: { visitDate: 'desc' },
          take: 5,
          include: { user: { select: { id: true, displayName: true } } },
        },
        _count: { select: { patients: true, ffcVisits: true } },
      },
    })

    if (!house) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'House not found' } },
        { status: 404 }
      )
    }

    const response: ApiResponse = { success: true, data: house }
    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/houses/[id] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch house' } },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    // Check house exists
    const existing = await prisma.house.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'House not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.lat !== undefined) updateData.lat = parseFloat(body.lat)
    if (body.lng !== undefined) updateData.lng = parseFloat(body.lng)
    if (body.riskLevel !== undefined) {
      if (!RISK_LEVELS.includes(body.riskLevel as typeof RISK_LEVELS[number])) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_VALUE', message: 'Invalid risk level' } },
          { status: 400 }
        )
      }
      updateData.riskLevel = body.riskLevel
    }
    if (body.qrCode !== undefined) updateData.qrCode = body.qrCode
    if (body.houseNo !== undefined) updateData.houseNo = body.houseNo
    if (body.address !== undefined) updateData.address = body.address

    const house = await prisma.house.update({
      where: { id },
      data: updateData,
      include: {
        village: { select: { id: true, name: true, code: true } },
        _count: { select: { patients: true } },
      },
    })

    const response: ApiResponse = { success: true, data: house }
    return NextResponse.json(response)
  } catch (error) {
    console.error('PATCH /api/v1/houses/[id] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update house' } },
      { status: 500 }
    )
  }
}
