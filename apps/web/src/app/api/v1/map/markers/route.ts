import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import { genderFromJhcis, jhcisHouseId, jhcisPersonId, jhcisQuery, normalizeJhcisCoordinate, riskFromChronic } from '@/lib/jhcis'
import type { MarkerData } from '@/types/api'

export const runtime = 'nodejs'

type MarkerRow = RowDataPacket & {
  pcucode: string
  hcode: number
  houseNo: string | null
  xgis: string | null
  ygis: string | null
  villageName: string | null
  personPcucode: string | null
  pid: number | null
  cid: string | null
  firstName: string | null
  lastName: string | null
  age: number | null
  genderCode: string | null
  chronicCount: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const villageId = searchParams.get('villageId')

    const where = ["COALESCE(h.xgis, '') <> ''", "COALESCE(h.ygis, '') <> ''"]
    const params: unknown[] = []
    if (villageId) {
      where.push('h.villcode = ?')
      params.push(villageId)
    }

    const rows = await jhcisQuery<MarkerRow>(
      `SELECT
        h.pcucode,
        h.hcode,
        h.hno AS houseNo,
        h.xgis,
        h.ygis,
        v.villname AS villageName,
        p.pcucodeperson AS personPcucode,
        p.pid,
        p.idcard AS cid,
        p.fname AS firstName,
        p.lname AS lastName,
        TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) AS age,
        p.sex AS genderCode,
        COUNT(pc.chroniccode) AS chronicCount
      FROM house h
      LEFT JOIN village v ON v.pcucode = h.pcucode AND v.villcode = h.villcode
      LEFT JOIN person p ON p.pcucodeperson = h.pcucode AND p.hcode = h.hcode
      LEFT JOIN personchronic pc ON pc.pcucodeperson = p.pcucodeperson AND pc.pid = p.pid
      WHERE ${where.join(' AND ')}
      GROUP BY h.pcucode, h.hcode, h.hno, h.xgis, h.ygis, v.villname, p.pcucodeperson, p.pid, p.idcard, p.fname, p.lname, p.birth, p.sex
      LIMIT 10000`,
      params
    )

    const markers: MarkerData[] = rows.flatMap((row) => {
      const coord = normalizeJhcisCoordinate(row.xgis, row.ygis)
      if (coord.lat === null || coord.lng === null) return []

      const hasPatient = row.personPcucode && row.pid !== null
      const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ')
      return [{
        id: hasPatient ? jhcisPersonId(row.personPcucode as string, row.pid as number) : jhcisHouseId(row.pcucode, row.hcode),
        lat: coord.lat,
        lng: coord.lng,
        type: hasPatient ? 'patient' as const : 'house' as const,
        riskLevel: riskFromChronic(row.chronicCount) as MarkerData['riskLevel'],
        label: hasPatient ? fullName : `บ้านเลขที่ ${row.houseNo || ''}`,
        popupData: {
          cid: row.cid,
          age: row.age,
          gender: hasPatient ? genderFromJhcis(row.genderCode) : undefined,
          chronicDisease: Number(row.chronicCount || 0) > 0,
          houseNo: row.houseNo,
          villageName: row.villageName,
        },
      }]
    })

    return NextResponse.json({ success: true, data: markers })
  } catch (error) {
    console.error('GET /api/v1/map/markers error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch markers from JHCIS' } },
      { status: 500 }
    )
  }
}
