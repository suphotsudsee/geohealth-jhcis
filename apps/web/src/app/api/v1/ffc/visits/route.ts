import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import { PAGINATION_DEFAULTS, VISIT_TYPES, VISIT_STATUSES } from '@/lib/constants'
import type { ApiResponse, FFCVisitRequest, Pagination } from '@/types/api'
import { z } from 'zod'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

const FFCVisitSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  houseId: z.string().optional(),
  visitDate: z.string().min(1, 'visitDate is required'),
  checkInLat: z.number().min(-90).max(90).optional(),
  checkInLng: z.number().min(-180).max(180).optional(),
  visitType: z.enum(VISIT_TYPES),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
  voiceNote: z.string().optional(),
  checklist: z.record(z.unknown()).optional(),
  nextVisitDate: z.string().optional(),
  status: z.enum(VISIT_STATUSES).optional(),
  offlineId: z.string().optional(),
})

function buildScopeFilter(user: { role: string; scope?: { village?: string; district?: string; province?: string } } | null) {
  if (!user) return {}
  if (user.role === 'ADMIN') return {}
  if (user.scope?.village) {
    return { patient: { house: { village: { code: user.scope.village } } } }
  }
  if (user.scope?.district) {
    return { patient: { house: { village: { subDistrict: { districtCode: user.scope.district } } } } }
  }
  return {}
}

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

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || String(PAGINATION_DEFAULTS.page)))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION_DEFAULTS.limit))))
    const patientId = searchParams.get('patientId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const visitType = searchParams.get('visitType')
    const villageId = searchParams.get('villageId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sort = searchParams.get('sort') || 'visitDate'
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

    const allowedSortFields = ['visitDate', 'createdAt', 'updatedAt', 'status', 'visitType']
    const sortField = allowedSortFields.includes(sort) ? sort : 'visitDate'

    const where: Record<string, unknown> = {
      ...buildScopeFilter(user),
    }

    if (patientId) where.patientId = patientId
    if (userId) where.userId = userId
    if (status && VISIT_STATUSES.includes(status as typeof VISIT_STATUSES[number])) {
      where.status = status
    }
    if (visitType && VISIT_TYPES.includes(visitType as typeof VISIT_TYPES[number])) {
      where.visitType = visitType
    }
    if (villageId) {
      where.patient = { ...((where.patient as Record<string, unknown>) || {}), house: { villageId } }
    }
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {}
      if (dateFrom) dateFilter.gte = new Date(dateFrom)
      if (dateTo) dateFilter.lte = new Date(dateTo)
      where.visitDate = dateFilter
    }

    const skip = (page - 1) * limit

    const [total, visits] = await Promise.all([
      prisma.fFCVisit.count({ where: where as any }),
      prisma.fFCVisit.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortField]: order },
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
      }),
    ])

    const pagination: Pagination = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }

    const response: ApiResponse = {
      success: true,
      data: visits,
      pagination,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/ffc/visits error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch visits' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const body: FFCVisitRequest & { status?: string; offlineId?: string } = await request.json()

    const validation = FFCVisitSchema.safeParse(body)
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

    // Check if offlineId already exists (dedup for offline sync)
    if (validData.offlineId) {
      const existing = await prisma.fFCVisit.findFirst({
        where: { offlineId: validData.offlineId },
      })
      if (existing) {
        return NextResponse.json(
          { success: true, data: existing },
          { status: 200 }
        )
      }
    }

    // Save photo data URIs to files
    const photoUrls: string[] = []
    if (validData.photos && validData.photos.length > 0) {
      for (const photo of validData.photos) {
        const url = await saveDataUriToFile(photo, 'photo')
        photoUrls.push(url)
      }
    }

    // Save voice note data URI to file
    let voiceNoteUrl: string | undefined
    if (validData.voiceNote) {
      voiceNoteUrl = await saveDataUriToFile(validData.voiceNote, 'voice')
    }

    const visit = await prisma.fFCVisit.create({
      data: {
        patientId: validData.patientId,
        houseId: validData.houseId,
        userId: user.userId,
        visitDate: new Date(validData.visitDate),
        checkInLat: validData.checkInLat,
        checkInLng: validData.checkInLng,
        visitType: validData.visitType as any,
        status: (validData.status as any) || 'PLANNED',
        notes: validData.notes,
        voiceNoteUrl,
        photoUrls: photoUrls.length > 0 ? JSON.stringify(photoUrls) : undefined,
        checklist: validData.checklist ? JSON.stringify(validData.checklist) : undefined,
        nextVisitDate: validData.nextVisitDate ? new Date(validData.nextVisitDate) : undefined,
        offlineId: validData.offlineId,
        isOfflineSync: !!validData.offlineId,
      },
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

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('POST /api/v1/ffc/visits error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create visit' } },
      { status: 500 }
    )
  }
}
