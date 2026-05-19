import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import { VISIT_TYPES, VISIT_STATUSES } from '@/lib/constants'
import type { ApiResponse } from '@/types/api'
import { z } from 'zod'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

const UpdateVisitSchema = z.object({
  visitDate: z.string().optional(),
  checkInLat: z.number().min(-90).max(90).optional(),
  checkInLng: z.number().min(-180).max(180).optional(),
  visitType: z.enum(VISIT_TYPES).optional(),
  status: z.enum(VISIT_STATUSES).optional(),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
  voiceNote: z.string().optional(),
  checklist: z.record(z.unknown()).optional(),
  nextVisitDate: z.string().optional(),
})

async function saveDataUriToFile(dataUri: string, prefix: string): Promise<string> {
  const matches = dataUri.match(/^data:(image\/\w+|audio\/\w+);base64,(.+)$/)
  if (!matches) return dataUri

  const mimeType = matches[1]
  const base64Data = matches[2]
  const buffer = Buffer.from(base64Data, 'base64')

  const ext = mimeType.includes('audio') ? '.ogg' : '.png'
  const filename = `${prefix}-${randomUUID()}${ext}`
  const filepath = join(process.cwd(), 'public', 'uploads', 'ffc', filename)

  await writeFile(filepath, buffer)
  return `/uploads/ffc/${filename}`
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    const visit = await prisma.fFCVisit.findUnique({
      where: { id },
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
            chronicDisease: true,
            drugAllergy: true,
            disability: true,
            bedridden: true,
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
        user: {
          select: { id: true, displayName: true, username: true },
        },
      },
    })

    if (!visit) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Visit not found' } },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const parsed = {
      ...visit,
      photoUrls: visit.photoUrls ? JSON.parse(visit.photoUrls) : [],
      checklist: visit.checklist ? JSON.parse(visit.checklist) : {},
    }

    const response: ApiResponse = {
      success: true,
      data: parsed,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/ffc/visits/[id] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch visit' } },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    const existing = await prisma.fFCVisit.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Visit not found' } },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = UpdateVisitSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.flatten().fieldErrors as Record<string, unknown>,
          },
        },
        { status: 400 }
      )
    }

    const validData = validation.data
    const updateData: Record<string, unknown> = {}

    if (validData.visitDate) updateData.visitDate = new Date(validData.visitDate)
    if (validData.checkInLat !== undefined) updateData.checkInLat = validData.checkInLat
    if (validData.checkInLng !== undefined) updateData.checkInLng = validData.checkInLng
    if (validData.visitType) updateData.visitType = validData.visitType
    if (validData.status) updateData.status = validData.status
    if (validData.notes !== undefined) updateData.notes = validData.notes
    if (validData.nextVisitDate) updateData.nextVisitDate = new Date(validData.nextVisitDate)

    // Handle photo uploads
    if (validData.photos) {
      const photoUrls: string[] = []
      for (const photo of validData.photos) {
        const url = await saveDataUriToFile(photo, 'photo')
        photoUrls.push(url)
      }
      updateData.photoUrls = JSON.stringify(photoUrls)
    }

    // Handle voice note
    if (validData.voiceNote) {
      updateData.voiceNoteUrl = await saveDataUriToFile(validData.voiceNote, 'voice')
    }

    // Handle checklist
    if (validData.checklist) {
      updateData.checklist = JSON.stringify(validData.checklist)
    }

    const visit = await prisma.fFCVisit.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            cid: true,
            fullName: true,
            age: true,
            gender: true,
            riskLevel: true,
          },
        },
        house: {
          select: {
            id: true,
            houseNo: true,
            address: true,
            village: { select: { id: true, name: true } },
          },
        },
        user: {
          select: { id: true, displayName: true },
        },
      },
    })

    const response: ApiResponse = {
      success: true,
      data: visit,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('PATCH /api/v1/ffc/visits/[id] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update visit' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = getUserFromRequest(_request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin only' } },
        { status: 403 }
      )
    }

    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    const existing = await prisma.fFCVisit.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Visit not found' } },
        { status: 404 }
      )
    }

    await prisma.fFCVisit.delete({ where: { id } })

    const response: ApiResponse = {
      success: true,
      data: { id },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('DELETE /api/v1/ffc/visits/[id] error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete visit' } },
      { status: 500 }
    )
  }
}
