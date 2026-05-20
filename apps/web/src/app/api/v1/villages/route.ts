import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import { jhcisQuery } from '@/lib/jhcis'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

type VillageRow = RowDataPacket & {
  id: string
  code: string
  name: string | null
  moo: number | null
  latitude: number | null
  longitude: number | null
  houses: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const districtCode = searchParams.get('districtCode')

    const where: string[] = []
    const params: unknown[] = []
    if (districtCode) {
      where.push('SUBSTRING(v.villcode, 1, 4) = ?')
      params.push(districtCode)
    }

    const rows = await jhcisQuery<VillageRow>(
      `SELECT
        v.villcode AS id,
        v.villcode AS code,
        v.villname AS name,
        v.villno AS moo,
        v.latitude,
        v.longitude,
        COUNT(h.hcode) AS houses
      FROM village v
      LEFT JOIN house h ON h.pcucode = v.pcucode AND h.villcode = v.villcode
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY v.villcode, v.villname, v.villno, v.latitude, v.longitude
      ORDER BY v.villno ASC, v.villname ASC`,
      params
    )

    const villages = rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      moo: row.moo,
      lat: row.latitude,
      lng: row.longitude,
      _count: { houses: Number(row.houses || 0) },
    }))

    const response: ApiResponse = { success: true, data: villages }
    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/villages error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch villages from JHCIS' } },
      { status: 500 }
    )
  }
}
