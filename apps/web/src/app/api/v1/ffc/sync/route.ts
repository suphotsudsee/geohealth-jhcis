import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/rbac'
import type { ApiResponse } from '@/types/api'
import { VISIT_TYPES } from '@/lib/constants'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { z } from 'zod'

export const runtime = 'nodejs'

const OfflineVisitSchema = z.object({
  offlineId: z.string().min(1),
  patientId: z.string().min(1),
  houseId: z.string().optional(),
  visitDate: z.string().min(1),
  checkInLat: z.number().optional(),
  checkInLng: z.number().optional(),
  visitType: z.enum(VISIT_TYPES),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional().default([]),
  voiceNote: z.string().optional(),
  checklist: z.record(z.unknown()).optional().default({}),
})

const SyncRequestSchema = z.object({
  visits: z.array(OfflineVisitSchema),
})

async function saveDataUriToFile(dataUri: string, prefix: string): Promise<string | null> {
  if (!dataUri.startsWith('data:')) return null
  const matches = dataUri.match(/^data:(image\/\w+|audio\/\w+);base64,(.+)$/)
  if (!matches) return null

  const mimeType = matches[1]
  const base64Data = matches[2]
  const buffer = Buffer.from(base64Data, 'base64')

  const ext = mimeType.includes('audio') ? '.ogg' : '.png'
  const filename = `${prefix}-${randomUUID()}${ext}`
  const filepath = join(process.cwd(), 'public', 'uploads', 'ffc', filename)

  await writeFile(filepath, buffer)
  return `/uploads/ffc/${filename}`
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

    const body = await request.json()
    const validation = SyncRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid sync request',
            details: validation.error.flatten().fieldErrors as Record<string, unknown>,
          },
        },
        { status: 400 }
      )
    }

    const { visits } = validation.data
    const synced: string[] = []
    const failed: { offlineId: string; error: string }[] = []

    for (const visit of visits) {
      try {
        // Check dedup by offlineId
        const existing = await prisma.fFCVisit.findFirst({
          where: { offlineId: visit.offlineId },
        })

        if (existing) {
          synced.push(visit.offlineId)
          continue
        }

        // Save photos
        const photoUrls: string[] = []
        for (const photo of visit.photos || []) {
          if (photo.startsWith('data:')) {
            const url = await saveDataUriToFile(photo, 'photo')
            if (url) photoUrls.push(url)
          } else {
            photoUrls.push(photo)
          }
        }

        // Save voice note
        let voiceNoteUrl: string | undefined
        if (visit.voiceNote) {
          if (visit.voiceNote.startsWith('data:')) {
            const url = await saveDataUriToFile(visit.voiceNote, 'voice')
            if (url) voiceNoteUrl = url
          } else {
            voiceNoteUrl = visit.voiceNote
          }
        }

        await prisma.fFCVisit.create({
          data: {
            patientId: visit.patientId,
            houseId: visit.houseId,
            userId: user.userId,
            visitDate: new Date(visit.visitDate),
            checkInLat: visit.checkInLat,
            checkInLng: visit.checkInLng,
            visitType: visit.visitType as any,
            status: 'COMPLETED',
            notes: visit.notes,
            voiceNoteUrl,
            photoUrls: photoUrls.length > 0 ? JSON.stringify(photoUrls) : undefined,
            checklist: Object.keys(visit.checklist).length > 0 ? JSON.stringify(visit.checklist) : undefined,
            offlineId: visit.offlineId,
            isOfflineSync: true,
          },
        })

        synced.push(visit.offlineId)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        failed.push({ offlineId: visit.offlineId, error: message })
      }
    }

    const response: ApiResponse = {
      success: true,
      data: { synced, failed },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('POST /api/v1/ffc/sync error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Sync failed' } },
      { status: 500 }
    )
  }
}
