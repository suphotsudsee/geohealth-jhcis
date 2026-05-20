import { NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import { jhcisQuery } from '@/lib/jhcis'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

type DiseaseRow = RowDataPacket & {
  diseaseCode: string
  diseaseName: string | null
  count: number
}

export async function GET() {
  try {
    const rows = await jhcisQuery<DiseaseRow>(
      `SELECT
        pc.chroniccode AS diseaseCode,
        COALESCE(cd.diseasenamethai, cd.diseasename, pc.chroniccode) AS diseaseName,
        COUNT(*) AS count
      FROM personchronic pc
      LEFT JOIN cdisease cd ON cd.diseasecode = pc.chroniccode
      GROUP BY pc.chroniccode, cd.diseasenamethai, cd.diseasename
      ORDER BY count DESC
      LIMIT 12`
    )

    const data = rows.map((row) => ({
      name: row.diseaseCode,
      label: row.diseaseName || row.diseaseCode,
      count: Number(row.count || 0),
    }))

    const response: ApiResponse<typeof data> = { success: true, data }
    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/analytics/diseases error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch disease stats from JHCIS' } },
      { status: 500 }
    )
  }
}
