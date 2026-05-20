import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import { jhcisQuery } from '@/lib/jhcis'

export const runtime = 'nodejs'

type FacilityRow = RowDataPacket & {
  pcucode: string | null
  name: string | null
  subDistrictName: string | null
  districtName: string | null
  provinceName: string | null
}

interface FacilityInfo {
  pcucode: string | null
  name: string
  subDistrictName: string | null
  districtName: string | null
  provinceName: string | null
}

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export async function GET(_request: NextRequest) {
  try {
    const rows = await jhcisQuery<FacilityRow>(
      `SELECT
         p.pcucode,
         c.hosname AS name,
         s.subdistname AS subDistrictName,
         d.distname AS districtName,
         pr.provname AS provinceName
       FROM (
         SELECT COALESCE(
           (SELECT pcucode FROM village WHERE pcucode IS NOT NULL AND pcucode != '' LIMIT 1),
           (SELECT pcucode FROM house WHERE pcucode IS NOT NULL AND pcucode != '' LIMIT 1),
           (SELECT pcucodeperson FROM person WHERE pcucodeperson IS NOT NULL AND pcucodeperson != '' LIMIT 1)
         ) AS pcucode
       ) p
       LEFT JOIN chospital c ON c.hoscode = p.pcucode
       LEFT JOIN csubdistrict s ON s.provcode = c.provcode AND s.distcode = c.distcode AND s.subdistcode = c.subdistcode
       LEFT JOIN cdistrict d ON d.provcode = c.provcode AND d.distcode = c.distcode
       LEFT JOIN cprovince pr ON pr.provcode = c.provcode
       LIMIT 1`
    )

    const facility = rows[0]
    const data: FacilityInfo = {
      pcucode: facility?.pcucode ?? null,
      name: facility?.name?.trim() || 'GeoHealth',
      subDistrictName: facility?.subDistrictName?.trim() || null,
      districtName: facility?.districtName?.trim() || null,
      provinceName: facility?.provinceName?.trim() || null,
    }

    const response: ApiResponse<FacilityInfo> = { success: true, data }
    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/facility error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch facility from JHCIS' } },
      { status: 500 }
    )
  }
}
