import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import { jhcisHouseId, jhcisQuery, normalizeJhcisCoordinate } from '@/lib/jhcis'
import { PAGINATION_DEFAULTS, RISK_LEVELS } from '@/lib/constants'
import type { ApiResponse, Pagination } from '@/types/api'

export const runtime = 'nodejs'

type HouseRow = RowDataPacket & {
  pcucode: string
  hcode: number
  houseNo: string | null
  villcode: string | null
  villno: number | null
  villageName: string | null
  xgis: string | null
  ygis: string | null
  telephonehouse: string | null
  peopleCount: number
  chronicCount: number
}

type CountRow = RowDataPacket & { total: number }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || String(PAGINATION_DEFAULTS.page)))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION_DEFAULTS.limit))))
    const villageId = searchParams.get('villageId')
    const riskLevel = searchParams.get('riskLevel')
    const search = searchParams.get('search')?.trim()

    const where: string[] = []
    const params: unknown[] = []

    if (villageId) {
      where.push('v.villcode = ?')
      params.push(villageId)
    }
    if (search) {
      const like = `%${search}%`
      where.push('(h.hno LIKE ? OR v.villname LIKE ? OR v.villcode LIKE ?)')
      params.push(like, like, like)
    }
    if (riskLevel && RISK_LEVELS.includes(riskLevel as typeof RISK_LEVELS[number])) {
      where.push(riskLevel === 'NORMAL' ? 'pc.pid IS NULL' : 'pc.pid IS NOT NULL')
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const skip = (page - 1) * limit
    const baseFrom = `FROM house h
      LEFT JOIN village v ON v.pcucode = h.pcucode AND v.villcode = h.villcode
      LEFT JOIN person p ON p.pcucodeperson = h.pcucode AND p.hcode = h.hcode
      LEFT JOIN personchronic pc ON pc.pcucodeperson = p.pcucodeperson AND pc.pid = p.pid`

    const [countRows, houseRows] = await Promise.all([
      jhcisQuery<CountRow>(
        `SELECT COUNT(*) AS total FROM (SELECT h.pcucode, h.hcode ${baseFrom} ${whereSql} GROUP BY h.pcucode, h.hcode) x`,
        params
      ),
      jhcisQuery<HouseRow>(
        `SELECT
          h.pcucode,
          h.hcode,
          h.hno AS houseNo,
          h.villcode,
          v.villno,
          v.villname AS villageName,
          h.xgis,
          h.ygis,
          h.telephonehouse,
          COUNT(DISTINCT p.pid) AS peopleCount,
          COUNT(DISTINCT pc.pid) AS chronicCount
        ${baseFrom}
        ${whereSql}
        GROUP BY h.pcucode, h.hcode, h.hno, h.villcode, v.villno, v.villname, h.xgis, h.ygis, h.telephonehouse
        ORDER BY h.dateupdate DESC, h.hcode DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, skip]
      ),
    ])

    const data = houseRows.map((house) => {
      const coord = normalizeJhcisCoordinate(house.xgis, house.ygis)
      return {
        id: jhcisHouseId(house.pcucode, house.hcode),
        houseNo: house.houseNo,
        moo: house.villno,
        address: house.houseNo ? `บ้านเลขที่ ${house.houseNo}` : null,
        lat: coord.lat,
        lng: coord.lng,
        riskLevel: Number(house.chronicCount || 0) > 0 ? 'HIGH' : 'NORMAL',
        telephone: house.telephonehouse,
        village: {
          id: house.villcode,
          code: house.villcode,
          name: house.villageName,
          moo: house.villno,
        },
        _count: { patients: Number(house.peopleCount || 0) },
      }
    })

    const total = Number(countRows[0]?.total || 0)
    const pagination: Pagination = { total, page, limit, totalPages: Math.ceil(total / limit) }
    const response: ApiResponse = { success: true, data, pagination }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/houses error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch houses from JHCIS' } },
      { status: 500 }
    )
  }
}
