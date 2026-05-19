import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

type ExportFormat = 'excel' | 'csv' | 'geojson' | 'shapefile'

function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const headerLine = headers.map((h) => escapeCsvField(h)).join(',')
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvField(row[h] as string | number | boolean | null | undefined)).join(',')
  )
  return [headerLine, ...dataLines].join('\r\n')
}

async function fetchPatientsForExport(filters: Record<string, unknown>) {
  const where: Record<string, unknown> = {}

  if (filters.riskLevel) where.riskLevel = filters.riskLevel
  if (filters.chronicCode) {
    where.chronicRecords = { some: { diseaseCode: filters.chronicCode } }
  }
  if (filters.villageId) {
    where.house = { ...(where.house as Record<string, unknown> || {}), villageId: filters.villageId }
  }
  if (filters.gender) where.gender = filters.gender

  const patients = await prisma.patient.findMany({
    where: where as any,
    include: {
      house: {
        include: {
          village: { select: { id: true, name: true, code: true, moo: true } },
        },
      },
      chronicRecords: { where: { isActive: true }, select: { diseaseName: true, diseaseCode: true } },
    },
    orderBy: { fullName: 'asc' },
  })

  return patients
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, filters = {}, format = 'csv' } = body

    if (!type) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required field: type' },
      }
      return NextResponse.json(response, { status: 400 })
    }

    const validFormats: ExportFormat[] = ['excel', 'csv', 'geojson', 'shapefile']
    if (!validFormats.includes(format as ExportFormat)) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
      }
      return NextResponse.json(response, { status: 400 })
    }

    const patients = await fetchPatientsForExport(filters as Record<string, unknown>)

    let content: string | Buffer
    let contentType: string
    let fileName: string

    if (format === 'csv' || format === 'excel') {
      const rows = patients.map((p) => ({
        CID: p.cid || '',
        HN: p.hn || '',
        'ชื่อ-นามสกุล': p.fullName,
        'ชื่อต้น': p.firstName || '',
        'นามสกุล': p.lastName || '',
        อายุ: p.age ?? '',
        เพศ: p.gender || '',
        เบอร์โทร: p.phone || '',
        'ระดับความเสี่ยง': p.riskLevel,
        โรคประจำตัว: p.chronicDisease || '',
        แพ้ยา: p.drugAllergy || '',
        พิการ: p.disability ? 'ใช่' : 'ไม่ใช่',
        'ติดเตียง': p.bedridden ? 'ใช่' : 'ไม่ใช่',
        'บ้านเลขที่': p.house?.houseNo || '',
        หมู่: p.house?.village?.moo ?? '',
        หมู่บ้าน: p.house?.village?.name || '',
        ละติจูด: p.lat?.toFixed(6) || '',
        ลองจิจูด: p.lng?.toFixed(6) || '',
        'วันที่ซิงค์ล่าสุด': p.lastSyncAt ? p.lastSyncAt.toISOString() : '',
      }))

      content = toCsv(rows)
      contentType = format === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.ms-excel'
      fileName = `${type}-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'csv'}`

      // Add BOM for Thai characters
      const bom = '\ufeff'
      content = bom + content
    } else if (format === 'geojson') {
      const features = patients
        .filter((p) => p.lat !== null && p.lng !== null)
        .map((p) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [p.lng as number, p.lat as number],
          },
          properties: {
            id: p.id,
            cid: p.cid,
            hn: p.hn,
            fullName: p.fullName,
            age: p.age,
            gender: p.gender,
            riskLevel: p.riskLevel,
            chronicDisease: p.chronicDisease,
            phone: p.phone,
            houseNo: p.house?.houseNo,
            village: p.house?.village?.name,
            villageCode: p.house?.village?.code,
          },
        }))

      const geojson = {
        type: 'FeatureCollection' as const,
        features,
      }

      content = JSON.stringify(geojson, null, 2)
      contentType = 'application/geo+json; charset=utf-8'
      fileName = `${type}-${new Date().toISOString().split('T')[0]}.geojson`
    } else {
      // shapefile — placeholder
      content = JSON.stringify({
        message: 'Shapefile export not yet implemented. Use GeoJSON instead.',
        type: 'shapefile',
        count: patients.length,
      }, null, 2)
      contentType = 'application/json; charset=utf-8'
      fileName = `${type}-${new Date().toISOString().split('T')[0]}.json`
    }

    const buffer = Buffer.from(content, 'utf-8')

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error) {
    console.error('POST /api/v1/reports/export error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export data' } },
      { status: 500 }
    )
  }
}
