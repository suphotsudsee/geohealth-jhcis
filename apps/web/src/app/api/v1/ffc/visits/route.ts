import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import { PAGINATION_DEFAULTS, VISIT_TYPES, VISIT_STATUSES } from '@/lib/constants'
import type { ApiResponse, FFCVisitRequest, Pagination } from '@/types/api'
import { z } from 'zod'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { genderFromJhcis, jhcisHouseId, jhcisPersonId, jhcisQuery, normalizeJhcisCoordinate, riskFromChronic } from '@/lib/jhcis'

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

type VisitRow = RowDataPacket & {
  pcucode: string
  visitno: number
  visitdate: Date
  timestart: string | null
  symptoms: string | null
  pressure: string | null
  pressure2: string | null
  weight: number | null
  height: number | null
  temperature: number | null
  user: string | null
  pcucodeperson: string
  pid: number
  cid: string | null
  firstName: string | null
  lastName: string | null
  age: number | null
  genderCode: string | null
  hcode: number | null
  houseNo: string | null
  xgis: string | null
  ygis: string | null
  villcode: string | null
  villageName: string | null
  chronicCount: number
}

type CountRow = RowDataPacket & { total: number }

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
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || String(PAGINATION_DEFAULTS.page)))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION_DEFAULTS.limit))))
    const patientId = searchParams.get('patientId')
    const status = searchParams.get('status')
    const visitType = searchParams.get('visitType')
    const villageId = searchParams.get('villageId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sort = searchParams.get('sort') || 'visitDate'
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

    const where: string[] = []
    const params: unknown[] = []

    if (patientId) {
      const [pcucodeperson, pid] = patientId.split(':')
      if (pcucodeperson && pid) {
        where.push('v.pcucodeperson = ? AND v.pid = ?')
        params.push(pcucodeperson, Number(pid))
      }
    }
    if (villageId) {
      where.push('vil.villcode = ?')
      params.push(villageId)
    }
    if (dateFrom) {
      where.push('v.visitdate >= ?')
      params.push(dateFrom)
    }
    if (dateTo) {
      where.push('v.visitdate <= ?')
      params.push(dateTo)
    }
    if (status && VISIT_STATUSES.includes(status as typeof VISIT_STATUSES[number]) && status !== 'COMPLETED') {
      where.push('1 = 0')
    }
    if (visitType && VISIT_TYPES.includes(visitType as typeof VISIT_TYPES[number]) && visitType !== 'ROUTINE') {
      where.push('1 = 0')
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const sortMap: Record<string, string> = {
      visitDate: 'v.visitdate',
      createdAt: 'v.visitdate',
      updatedAt: 'v.dateupdate',
      status: 'v.visitdate',
      visitType: 'v.visitdate',
    }
    const orderBy = sortMap[sort] || sortMap.visitDate

    const skip = (page - 1) * limit
    const baseFrom = `FROM visit v
      LEFT JOIN person p ON p.pcucodeperson = v.pcucodeperson AND p.pid = v.pid
      LEFT JOIN house h ON h.pcucode = p.pcucodeperson AND h.hcode = p.hcode
      LEFT JOIN village vil ON vil.pcucode = h.pcucode AND vil.villcode = h.villcode
      LEFT JOIN personchronic pc ON pc.pcucodeperson = p.pcucodeperson AND pc.pid = p.pid`

    const [countRows, visitRows] = await Promise.all([
      jhcisQuery<CountRow>(`SELECT COUNT(DISTINCT CONCAT(v.pcucode, ':', v.visitno)) AS total ${baseFrom} ${whereSql}`, params),
      jhcisQuery<VisitRow>(
        `SELECT
          v.pcucode,
          v.visitno,
          v.visitdate,
          v.timestart,
          v.symptoms,
          v.pressure,
          v.pressure2,
          v.weight,
          v.height,
          v.temperature,
          v.username AS user,
          p.pcucodeperson,
          p.pid,
          p.idcard AS cid,
          p.fname AS firstName,
          p.lname AS lastName,
          TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) AS age,
          p.sex AS genderCode,
          h.hcode,
          h.hno AS houseNo,
          h.xgis,
          h.ygis,
          h.villcode,
          vil.villname AS villageName,
          COUNT(pc.chroniccode) AS chronicCount
        ${baseFrom}
        ${whereSql}
        GROUP BY v.pcucode, v.visitno, v.visitdate, v.timestart, v.symptoms, v.pressure, v.pressure2,
          v.weight, v.height, v.temperature, v.username, p.pcucodeperson, p.pid, p.idcard,
          p.fname, p.lname, p.birth, p.sex, h.hcode, h.hno, h.xgis, h.ygis, h.villcode, vil.villname
        ORDER BY ${orderBy} ${order}
        LIMIT ? OFFSET ?`,
        [...params, limit, skip]
      ),
    ])

    const visits = visitRows.map((visit) => {
      const coord = normalizeJhcisCoordinate(visit.xgis, visit.ygis)
      const fullName = [visit.firstName, visit.lastName].filter(Boolean).join(' ') || '-'
      const patientIdValue = jhcisPersonId(visit.pcucodeperson, visit.pid)
      const houseIdValue = visit.hcode ? jhcisHouseId(visit.pcucodeperson, visit.hcode) : null

      return {
        id: `${visit.pcucode}:${visit.visitno}`,
        patientId: patientIdValue,
        houseId: houseIdValue,
        userId: visit.user,
        visitDate: visit.visitdate,
        checkInLat: coord.lat,
        checkInLng: coord.lng,
        visitType: 'ROUTINE',
        status: 'COMPLETED',
        notes: visit.symptoms,
        checklist: {
          pressure: visit.pressure || visit.pressure2,
          weight: visit.weight,
          height: visit.height,
          temperature: visit.temperature,
        },
        patient: {
          id: patientIdValue,
          cid: visit.cid,
          hn: String(visit.pid),
          fullName,
          age: visit.age,
          gender: genderFromJhcis(visit.genderCode),
          riskLevel: riskFromChronic(visit.chronicCount),
          lat: coord.lat,
          lng: coord.lng,
        },
        house: houseIdValue
          ? {
              id: houseIdValue,
              houseNo: visit.houseNo,
              lat: coord.lat,
              lng: coord.lng,
              village: { id: visit.villcode, code: visit.villcode, name: visit.villageName },
            }
          : null,
        user: { id: visit.user, displayName: visit.user, username: visit.user },
      }
    })

    const pagination: Pagination = {
      total: Number(countRows[0]?.total || 0),
      page,
      limit,
      totalPages: Math.ceil(Number(countRows[0]?.total || 0) / limit),
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
