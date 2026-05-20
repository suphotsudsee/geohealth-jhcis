import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import { genderFromJhcis, jhcisPersonId, jhcisQuery, normalizeJhcisCoordinate, riskFromChronic } from '@/lib/jhcis'
import type { ApiResponse, PatientSummary } from '@/types/api'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    if (!q) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_QUERY', message: 'Search query is required' } },
        { status: 400 }
      )
    }

    const like = `%${q}%`
    const rows = await jhcisQuery<PatientRow>(
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
      FROM person p
      LEFT JOIN house h ON h.pcucode = p.pcucodeperson AND h.hcode = p.hcode
      LEFT JOIN village v ON v.pcucode = h.pcucode AND v.villcode = h.villcode
      LEFT JOIN personchronic pc ON pc.pcucodeperson = p.pcucodeperson AND pc.pid = p.pid
      WHERE (p.idcard LIKE ? OR CAST(p.pid AS CHAR) LIKE ? OR p.fname LIKE ? OR p.lname LIKE ? OR CONCAT(p.fname, ' ', p.lname) LIKE ?)
      GROUP BY p.pcucodeperson, p.pid, p.idcard, p.fname, p.lname, p.birth, p.sex, h.xgis, h.ygis, h.hno, v.villname
      ORDER BY p.dateupdate DESC
      LIMIT ?`,
      [like, like, like, like, like, limit]
    )

    const data: PatientSummary[] = rows.map((p) => {
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
        house: { houseNo: p.houseNo, village: { name: p.villageName } },
      }
    })

    const response: ApiResponse<PatientSummary[]> = { success: true, data }
    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/patients/search error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Search failed in JHCIS' } },
      { status: 500 }
    )
  }
}
