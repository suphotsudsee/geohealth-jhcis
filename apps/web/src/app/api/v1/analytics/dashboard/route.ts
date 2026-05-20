import { NextRequest, NextResponse } from 'next/server'
import { jhcisQuery } from '@/lib/jhcis'
import type { ApiResponse, DashboardStats } from '@/types/api'

export const runtime = 'nodejs'

type CountRow = {
  totalPopulation: number
  totalChronic: number
  totalBedridden: number
  totalRisk: number
  ffcToday: number
  ffcThisMonth: number
  coveredVillages: number
  totalVillages: number
}

export async function GET(_request: NextRequest) {
  try {
    const rows = await jhcisQuery<CountRow & import('mysql2/promise').RowDataPacket>(
      `SELECT
        (SELECT COUNT(*) FROM person) AS totalPopulation,
        (SELECT COUNT(*) FROM personchronic pc) AS totalChronic,
        (SELECT COUNT(DISTINCT CONCAT(pu.pcucodeperson, ':', pu.pid)) FROM personunable pu) AS totalBedridden,
        (SELECT COUNT(*) FROM personchronic pc) AS totalRisk,
        (SELECT COUNT(*) FROM visit v WHERE v.visitdate = CURDATE()) AS ffcToday,
        (SELECT COUNT(*) FROM visit v WHERE v.visitdate >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS ffcThisMonth,
        (SELECT COUNT(DISTINCT h.villcode) FROM house h WHERE COALESCE(h.xgis, '') <> '' AND COALESCE(h.ygis, '') <> '') AS coveredVillages,
        (SELECT COUNT(*) FROM village) AS totalVillages`
    )

    const data = rows[0]
    const stats: DashboardStats = {
      totalPopulation: Number(data.totalPopulation || 0),
      totalChronic: Number(data.totalChronic || 0),
      totalBedridden: Number(data.totalBedridden || 0),
      totalRisk: Number(data.totalRisk || 0),
      ffcToday: Number(data.ffcToday || 0),
      ffcThisMonth: Number(data.ffcThisMonth || 0),
      coveredVillages: Number(data.coveredVillages || 0),
      totalVillages: Number(data.totalVillages || 0),
    }

    const response: ApiResponse<DashboardStats> = { success: true, data: stats }
    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/analytics/dashboard error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard stats from JHCIS' } },
      { status: 500 }
    )
  }
}
