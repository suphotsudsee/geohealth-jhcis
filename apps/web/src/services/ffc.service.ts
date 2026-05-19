import prisma from '@/lib/prisma'
import type { VisitType, VisitStatus } from '@prisma/client'

export interface FFCVisitFilters {
  page?: number
  limit?: number
  patientId?: string
  userId?: string
  status?: string
  visitType?: string
  fromDate?: string
  toDate?: string
  villageId?: string
}

export interface CreateFFCVisitData {
  patientId: string
  houseId?: string
  userId?: string
  visitDate: string
  checkInLat?: number
  checkInLng?: number
  checkInAccuracy?: number
  visitType: VisitType
  status?: VisitStatus
  notes?: string
  voiceNoteUrl?: string
  photoUrls?: string[]
  checklist?: Record<string, unknown>
  nextVisitDate?: string
  isOfflineSync?: boolean
  offlineId?: string
}

export class FFCService {
  async listVisits(filters: FFCVisitFilters) {
    const { page = 1, limit = 50, patientId, userId, status, visitType, fromDate, toDate, villageId } = filters

    const where: Record<string, unknown> = {}

    if (patientId) where.patientId = patientId
    if (userId) where.userId = userId
    if (status) where.status = status
    if (visitType) where.visitType = visitType
    if (fromDate || toDate) {
      const dateFilter: Record<string, Date> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) dateFilter.lte = new Date(toDate)
      where.visitDate = dateFilter
    }
    if (villageId) {
      where.house = { villageId }
    }

    const skip = (page - 1) * limit

    const [total, visits] = await Promise.all([
      prisma.fFCVisit.count({ where: where as any }),
      prisma.fFCVisit.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { visitDate: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true, hn: true, riskLevel: true } },
          user: { select: { id: true, displayName: true } },
          house: {
            select: {
              id: true,
              houseNo: true,
              village: { select: { name: true, moo: true } },
            },
          },
        },
      }),
    ])

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: visits,
    }
  }

  async createVisit(data: CreateFFCVisitData) {
    const visit = await prisma.fFCVisit.create({
      data: {
        patientId: data.patientId,
        houseId: data.houseId,
        userId: data.userId,
        visitDate: new Date(data.visitDate),
        checkInLat: data.checkInLat,
        checkInLng: data.checkInLng,
        checkInAccuracy: data.checkInAccuracy,
        visitType: data.visitType,
        status: data.status || 'PLANNED',
        notes: data.notes,
        voiceNoteUrl: data.voiceNoteUrl,
        photoUrls: data.photoUrls ? JSON.stringify(data.photoUrls) : undefined,
        checklist: data.checklist ? JSON.stringify(data.checklist) : undefined,
        nextVisitDate: data.nextVisitDate ? new Date(data.nextVisitDate) : undefined,
        isOfflineSync: data.isOfflineSync || false,
        offlineId: data.offlineId,
      },
      include: {
        patient: { select: { id: true, fullName: true } },
        user: { select: { id: true, displayName: true } },
      },
    })

    return visit
  }

  async getVisitById(id: string) {
    const visit = await prisma.fFCVisit.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, fullName: true, hn: true, cid: true, age: true, gender: true, riskLevel: true, phone: true },
        },
        user: { select: { id: true, displayName: true } },
        house: {
          select: {
            id: true,
            houseNo: true,
            address: true,
            lat: true,
            lng: true,
            village: { select: { name: true, code: true, moo: true } },
          },
        },
      },
    })

    return visit
  }

  async updateVisit(id: string, data: Partial<CreateFFCVisitData>) {
    const updateData: Record<string, unknown> = {}

    if (data.visitDate) updateData.visitDate = new Date(data.visitDate)
    if (data.checkInLat !== undefined) updateData.checkInLat = data.checkInLat
    if (data.checkInLng !== undefined) updateData.checkInLng = data.checkInLng
    if (data.checkInAccuracy !== undefined) updateData.checkInAccuracy = data.checkInAccuracy
    if (data.visitType) updateData.visitType = data.visitType
    if (data.status) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.voiceNoteUrl !== undefined) updateData.voiceNoteUrl = data.voiceNoteUrl
    if (data.photoUrls) updateData.photoUrls = JSON.stringify(data.photoUrls)
    if (data.checklist) updateData.checklist = JSON.stringify(data.checklist)
    if (data.nextVisitDate) updateData.nextVisitDate = new Date(data.nextVisitDate)
    if (data.houseId) updateData.houseId = data.houseId
    if (data.userId) updateData.userId = data.userId

    const visit = await prisma.fFCVisit.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, fullName: true } },
        user: { select: { id: true, displayName: true } },
      },
    })

    return visit
  }

  async getSchedule(userId: string, date: Date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const visits = await prisma.fFCVisit.findMany({
      where: {
        userId,
        visitDate: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { visitDate: 'asc' },
      include: {
        patient: { select: { id: true, fullName: true, hn: true, riskLevel: true, phone: true, lat: true, lng: true } },
        house: {
          select: {
            id: true,
            houseNo: true,
            lat: true,
            lng: true,
            village: { select: { name: true, moo: true } },
          },
        },
      },
    })

    return visits
  }

  async syncBatch(visits: CreateFFCVisitData[]) {
    const results = await prisma.$transaction(
      visits.map((v) =>
        prisma.fFCVisit.create({
          data: {
            patientId: v.patientId,
            houseId: v.houseId,
            userId: v.userId,
            visitDate: new Date(v.visitDate),
            checkInLat: v.checkInLat,
            checkInLng: v.checkInLng,
            checkInAccuracy: v.checkInAccuracy,
            visitType: v.visitType,
            status: v.status || 'COMPLETED',
            notes: v.notes,
            voiceNoteUrl: v.voiceNoteUrl,
            photoUrls: v.photoUrls ? JSON.stringify(v.photoUrls) : undefined,
            checklist: v.checklist ? JSON.stringify(v.checklist) : undefined,
            nextVisitDate: v.nextVisitDate ? new Date(v.nextVisitDate) : undefined,
            isOfflineSync: true,
            offlineId: v.offlineId,
          },
        })
      )
    )

    return results
  }
}

export const ffcService = new FFCService()
