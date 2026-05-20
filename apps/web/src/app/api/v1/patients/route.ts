import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import { genderFromJhcis, jhcisPersonId, jhcisQuery, normalizeJhcisCoordinate, riskFromChronic } from '@/lib/jhcis'
import { PAGINATION_DEFAULTS, RISK_LEVELS } from '@/lib/constants'
import type { ApiResponse, PatientSummary, Pagination } from '@/types/api'

export const runtime = 'nodejs'

type PatientRow = RowDataPacket & {
  pcucodeperson: string
  pid: number
  cid: string | null
  hn: string | null
  firstName: string | null
  lastName: string | null
  age: number | null
  genderCode: string | null
  xgis: string | null
  ygis: string | null
  houseNo: string | null
  villageName: string | null
  chronicCount: number
}

type CountRow = RowDataPacket & { total: number }

function addFilter(where: string[], params: unknown[], condition: string, ...values: unknown[]) {
  where.push(condition)
  params.push(...values)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || String(PAGINATION_DEFAULTS.page)))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION_DEFAULTS.limit))))
    const riskLevel = searchParams.get('riskLevel')
    const chronicCode = searchParams.get('chronicCode')
    const villageId = searchParams.get('villageId')
    const ageMin = searchParams.get('ageMin')
    const ageMax = searchParams.get('ageMax')
    const gender = searchParams.get('gender')
    const search = searchParams.get('search')?.trim()
    const sort = searchParams.get('sort') || 'updatedAt'
    const order = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC'

    const where: string[] = []
    const params: unknown[] = []

    if (chronicCode) addFilter(where, params, 'pc.chroniccode = ?', chronicCode)
    if (villageId) addFilter(where, params, 'v.villcode = ?', villageId)
    if (ageMin) addFilter(where, params, 'TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) >= ?', Number(ageMin))
    if (ageMax) addFilter(where, params, 'TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) <= ?', Number(ageMax))
    if (gender === 'MALE') addFilter(where, params, "p.sex = '1'")
    if (gender === 'FEMALE') addFilter(where, params, "p.sex = '2'")
    if (gender === 'UNKNOWN') addFilter(where, params, "(p.sex IS NULL OR p.sex NOT IN ('1', '2'))")
    if (riskLevel && RISK_LEVELS.includes(riskLevel as typeof RISK_LEVELS[number])) {
      if (riskLevel === 'NORMAL') addFilter(where, params, 'pc.pid IS NULL')
      else addFilter(where, params, 'pc.pid IS NOT NULL')
    }
    if (search) {
      const like = `%${search}%`
      addFilter(
        where,
        params,
        '(p.idcard LIKE ? OR CAST(p.pid AS CHAR) LIKE ? OR p.fname LIKE ? OR p.lname LIKE ? OR CONCAT(p.fname, " ", p.lname) LIKE ?)',
        like,
        like,
        like,
        like,
        like
      )
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const sortMap: Record<string, string> = {
      fullName: 'p.fname',
      age: 'age',
      updatedAt: 'p.dateupdate',
      createdAt: 'p.dateregis',
      riskLevel: 'chronicCount',
    }
    const orderBy = sortMap[sort] || sortMap.updatedAt
    const skip = (page - 1) * limit

    const baseFrom = `FROM person p
      LEFT JOIN house h ON h.pcucode = p.pcucodeperson AND h.hcode = p.hcode
      LEFT JOIN village v ON v.pcucode = h.pcucode AND v.villcode = h.villcode
      LEFT JOIN personchronic pc ON pc.pcucodeperson = p.pcucodeperson AND pc.pid = p.pid`

    const [countRows, patientRows] = await Promise.all([
      jhcisQuery<CountRow>(
        `SELECT COUNT(*) AS total FROM (SELECT p.pcucodeperson, p.pid ${baseFrom} ${whereSql} GROUP BY p.pcucodeperson, p.pid) x`,
        params
      ),
      jhcisQuery<PatientRow>(
        `SELECT
          p.pcucodeperson,
          p.pid,
          p.idcard AS cid,
          CAST(p.pid AS CHAR) AS hn,
          p.fname AS firstName,
          p.lname AS lastName,
          TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) AS age,
          p.sex AS genderCode,
          h.xgis,
          h.ygis,
          h.hno AS houseNo,
          v.villname AS villageName,
          COUNT(pc.chroniccode) AS chronicCount
        ${baseFrom}
        ${whereSql}
        GROUP BY p.pcucodeperson, p.pid, p.idcard, p.fname, p.lname, p.birth, p.sex, h.xgis, h.ygis, h.hno, v.villname
        ORDER BY ${orderBy} ${order}
        LIMIT ? OFFSET ?`,
        [...params, limit, skip]
      ),
    ])

    const data: PatientSummary[] = patientRows.map((p) => {
      const coord = normalizeJhcisCoordinate(p.xgis, p.ygis)
      return {
        id: jhcisPersonId(p.pcucodeperson, p.pid),
        cid: p.cid,
        hn: p.hn,
        fullName: [p.firstName, p.lastName].filter(Boolean).join(' ') || '-',
        age: p.age,
        gender: genderFromJhcis(p.genderCode) as PatientSummary['gender'],
        riskLevel: riskFromChronic(p.chronicCount) as PatientSummary['riskLevel'],
        lat: coord.lat,
        lng: coord.lng,
        house: {
          houseNo: p.houseNo,
          village: { name: p.villageName },
        },
      }
    })

    const total = Number(countRows[0]?.total || 0)
    const pagination: Pagination = { total, page, limit, totalPages: Math.ceil(total / limit) }
    const response: ApiResponse<PatientSummary[]> = { success: true, data, pagination }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/patients error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch patients from JHCIS' } },
      { status: 500 }
    )
  }
}
