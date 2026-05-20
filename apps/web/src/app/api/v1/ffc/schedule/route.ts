import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import { genderFromJhcis, jhcisHouseId, jhcisPersonId, jhcisQuery, normalizeJhcisCoordinate, riskFromChronic } from '@/lib/jhcis'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

type ScheduleRow = RowDataPacket & {
  pcucode: string
  visitno: number
  visitdate: Date
  timestart: string | null
  symptoms: string | null
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

export async function GET(_request: NextRequest) {
  try {
    const rows = await jhcisQuery<ScheduleRow>(
      `SELECT
        v.pcucode,
        v.visitno,
        v.visitdate,
        v.timestart,
        v.symptoms,
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
      FROM visit v
      LEFT JOIN person p ON p.pcucodeperson = v.pcucodeperson AND p.pid = v.pid
      LEFT JOIN house h ON h.pcucode = p.pcucodeperson AND h.hcode = p.hcode
      LEFT JOIN village vil ON vil.pcucode = h.pcucode AND vil.villcode = h.villcode
      LEFT JOIN personchronic pc ON pc.pcucodeperson = p.pcucodeperson AND pc.pid = p.pid
      WHERE v.visitdate = CURDATE()
      GROUP BY v.pcucode, v.visitno, v.visitdate, v.timestart, v.symptoms, p.pcucodeperson, p.pid,
        p.idcard, p.fname, p.lname, p.birth, p.sex, h.hcode, h.hno, h.xgis, h.ygis, h.villcode, vil.villname
      ORDER BY v.timestart ASC, v.visitno ASC
      LIMIT 100`
    )

    const visits = rows.map((visit) => {
      const coord = normalizeJhcisCoordinate(visit.xgis, visit.ygis)
      const patientId = jhcisPersonId(visit.pcucodeperson, visit.pid)
      const houseId = visit.hcode ? jhcisHouseId(visit.pcucodeperson, visit.hcode) : null
      const fullName = [visit.firstName, visit.lastName].filter(Boolean).join(' ') || '-'

      return {
        id: `${visit.pcucode}:${visit.visitno}`,
        patientId,
        houseId,
        visitDate: visit.visitdate,
        visitType: 'ROUTINE',
        status: 'COMPLETED',
        notes: visit.symptoms,
        patient: {
          id: patientId,
          cid: visit.cid,
          hn: String(visit.pid),
          fullName,
          age: visit.age,
          gender: genderFromJhcis(visit.genderCode),
          riskLevel: riskFromChronic(visit.chronicCount),
          lat: coord.lat,
          lng: coord.lng,
        },
        house: houseId
          ? {
              id: houseId,
              houseNo: visit.houseNo,
              lat: coord.lat,
              lng: coord.lng,
              village: { id: visit.villcode, code: visit.villcode, name: visit.villageName },
            }
          : null,
      }
    })

    const response: ApiResponse = { success: true, data: visits }
    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/ffc/schedule error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch schedule from JHCIS' } },
      { status: 500 }
    )
  }
}
