import prisma from '@/lib/prisma'

export interface HouseFilters {
  page?: number
  limit?: number
  villageId?: string
  riskLevel?: string
}

export class HouseService {
  async listHouses(filters: HouseFilters) {
    const { page = 1, limit = 50, villageId, riskLevel } = filters

    const where: Record<string, unknown> = {}

    if (villageId) {
      where.villageId = villageId
    }

    if (riskLevel) {
      where.riskLevel = riskLevel
    }

    const skip = (page - 1) * limit

    const [total, houses] = await Promise.all([
      prisma.house.count({ where: where as any }),
      prisma.house.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          village: { select: { id: true, name: true, code: true, moo: true } },
          _count: { select: { patients: true } },
        },
      }),
    ])

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: houses,
    }
  }

  async getHouseById(id: string) {
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
          select: {
            id: true,
            fullName: true,
            age: true,
            gender: true,
            riskLevel: true,
            chronicDisease: true,
          },
        },
        _count: { select: { patients: true, ffcVisits: true } },
      },
    })

    return house
  }

  async updateHouse(id: string, data: {
    houseNo?: string
    moo?: number
    lat?: number
    lng?: number
    address?: string
    riskLevel?: string
    qrCode?: string
    villageId?: string
  }) {
    const { villageId, ...rest } = data
    const updateData: Record<string, unknown> = { ...rest }
    if (villageId) updateData.village = { connect: { id: villageId } }

    const house = await prisma.house.update({
      where: { id },
      data: updateData,
      include: {
        village: { select: { id: true, name: true, code: true } },
      },
    })

    return house
  }
}

export const houseService = new HouseService()
