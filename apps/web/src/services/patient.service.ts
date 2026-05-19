import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export interface PatientFilters {
  page?: number
  limit?: number
  riskLevel?: string
  chronicCode?: string
  villageId?: string
  ageMin?: number
  ageMax?: number
  gender?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export interface PatientProfileData {
  id: string
  cid: string | null
  hn: string | null
  fullName: string
  firstName: string | null
  lastName: string | null
  birthDate: Date | null
  age: number | null
  gender: string | null
  phone: string | null
  riskLevel: string
  chronicDisease: string | null
  drugAllergy: string | null
  disability: boolean | null
  bedridden: boolean | null
  imageUrl: string | null
  lat: number | null
  lng: number | null
  house: {
    id: string
    houseNo: string | null
    moo: number | null
    address: string | null
    lat: number | null
    lng: number | null
    village: {
      id: string
      name: string
      code: string
      moo: number | null
    } | null
  } | null
  chronicRecords: Array<{
    id: string
    diseaseCode: string
    diseaseName: string
    diagnosedDate: Date | null
    severity: string | null
    isActive: boolean
    lastFollowUp: Date | null
    hospitalCode: string | null
  }>
  recentVisits: Array<{
    id: string
    visitDate: Date
    diagnosisName: string | null
    hospitalCode: string | null
    visitType: string | null
  }>
  recentLabs: Array<{
    id: string
    labDate: Date
    labName: string
    result: string
    unit: string | null
    normalRange: string | null
    abnormal: boolean
  }>
  currentDrugs: Array<{
    id: string
    drugName: string
    dosage: string | null
    frequency: string | null
    startDate: Date | null
    endDate: Date | null
  }>
  recentFfcVisits: Array<{
    id: string
    visitDate: Date
    visitType: string
    status: string
    notes: string | null
    checkInLat: number | null
    checkInLng: number | null
    nextVisitDate: Date | null
    user: { id: string; displayName: string } | null
  }>
  lastSyncAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface NearbyPatient {
  id: string
  fullName: string
  lat: number
  lng: number
  distance: number
  riskLevel: string
}

export class PatientService {
  async listPatients(filters: PatientFilters) {
    const {
      page = 1,
      limit = 50,
      riskLevel,
      chronicCode,
      villageId,
      ageMin,
      ageMax,
      gender,
      sort = 'updatedAt',
      order = 'desc',
    } = filters

    const allowedSortFields = ['fullName', 'age', 'updatedAt', 'createdAt', 'riskLevel']
    const sortField = allowedSortFields.includes(sort) ? sort : 'updatedAt'

    const where: Record<string, unknown> = {}

    if (riskLevel) {
      where.riskLevel = riskLevel
    }

    if (chronicCode) {
      where.chronicRecords = { some: { diseaseCode: chronicCode } }
    }

    if (villageId) {
      where.house = { ...(where.house as Record<string, unknown> || {}), villageId }
    }

    if (ageMin || ageMax) {
      const ageFilter: Record<string, number> = {}
      if (ageMin) ageFilter.gte = ageMin
      if (ageMax) ageFilter.lte = ageMax
      where.age = ageFilter
    }

    if (gender) {
      where.gender = gender
    }

    const skip = (page - 1) * limit

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where: where as Prisma.PatientWhereInput }),
      prisma.patient.findMany({
        where: where as Prisma.PatientWhereInput,
        skip,
        take: limit,
        orderBy: { [sortField]: order },
        include: {
          house: {
            include: {
              village: { select: { id: true, name: true, code: true } },
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
      data: patients,
    }
  }

  async searchPatients(query: string, limit = 20) {
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { fullName: { contains: query } },
          { cid: { contains: query } },
          { hn: { contains: query } },
          { firstName: { contains: query } },
          { lastName: { contains: query } },
        ],
      },
      take: limit,
      include: {
        house: {
          include: {
            village: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return patients
  }

  async getPatientById(id: string) {
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

    return patient
  }

  async getPatientProfile(id: string): Promise<PatientProfileData | null> {
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

    if (!patient) return null

    return {
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
      house: patient.house
        ? {
            id: patient.house.id,
            houseNo: patient.house.houseNo,
            moo: patient.house.moo,
            address: patient.house.address,
            lat: patient.house.lat,
            lng: patient.house.lng,
            village: patient.house.village
              ? {
                  id: patient.house.village.id,
                  name: patient.house.village.name,
                  code: patient.house.village.code,
                  moo: patient.house.village.moo,
                }
              : null,
          }
        : null,
      chronicRecords: patient.chronicRecords,
      recentVisits: patient.visitRecords,
      recentLabs: patient.labResults,
      currentDrugs: patient.drugRecords,
      recentFfcVisits: patient.ffcVisits,
      lastSyncAt: patient.lastSyncAt,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    }
  }

  async findNearby(lat: number, lng: number, radiusKm: number): Promise<NearbyPatient[]> {
    // Approximate: 1 degree latitude ≈ 111km, 1 degree longitude ≈ 111*cos(lat) km
    const latDelta = radiusKm / 111
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))

    const patients = await prisma.patient.findMany({
      where: {
        lat: { gte: lat - latDelta, lte: lat + latDelta },
        lng: { gte: lng - lngDelta, lte: lng + lngDelta },
      },
      select: {
        id: true,
        fullName: true,
        lat: true,
        lng: true,
        riskLevel: true,
      },
    })

    return patients
      .filter((p): p is typeof p & { lat: number; lng: number } => p.lat !== null && p.lng !== null)
      .map((p) => {
        const distance = this.haversine(lat, lng, p.lat, p.lng)
        return { ...p, distance }
      })
      .filter((p) => p.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
}

export const patientService = new PatientService()
