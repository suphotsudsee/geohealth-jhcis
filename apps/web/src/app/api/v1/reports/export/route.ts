import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import { jhcisQuery, normalizeJhcisCoordinate, riskFromHouseFactors } from '@/lib/jhcis'

export const runtime = 'nodejs'

type ExportFormat = 'excel' | 'csv' | 'geojson'
type ReportType = 'patient-list' | 'chronic-summary' | 'ffc-report' | 'village-report'

type ReportFilters = {
  villageId?: string
  chronicCode?: string
  dateRange?: string
}

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '\ufeffไม่มีข้อมูล\r\n'
  const headers = Object.keys(rows[0])
  return '\ufeff' + [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvField(row[header])).join(',')),
  ].join('\r\n')
}

function dateRangeSql(dateColumn: string, dateRange?: string) {
  if (dateRange === '3m') return `${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)`
  if (dateRange === '6m') return `${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)`
  if (dateRange === '1y') return `${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)`
  return ''
}

async function getPatientRows(filters: ReportFilters) {
  const where = ['1=1']
  const params: unknown[] = []

  if (filters.villageId) {
    where.push('h.villcode = ?')
    params.push(filters.villageId)
  }
  if (filters.chronicCode) {
    where.push('EXISTS (SELECT 1 FROM personchronic pcx WHERE pcx.pcucodeperson = p.pcucodeperson AND pcx.pid = p.pid AND pcx.chroniccode = ?)')
    params.push(filters.chronicCode)
  }

  type PatientRow = RowDataPacket & {
    pcucodeperson: string
    pid: number
    cid: string | null
    fullName: string
    birth: Date | string | null
    age: number | null
    gender: string
    phone: string | null
    houseNo: string | null
    villageNo: number | null
    villageName: string | null
    latRaw: string | null
    lngRaw: string | null
    chronicDiseases: string | null
    chronicCount: number
    bedridden: number
  }

  const rows = await jhcisQuery<PatientRow>(
    `SELECT
      p.pcucodeperson,
      p.pid,
      p.idcard AS cid,
      NULLIF(TRIM(CONCAT(COALESCE(p.fname, ''), ' ', COALESCE(p.lname, ''))), '') AS fullName,
      p.birth,
      TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) AS age,
      CASE p.sex WHEN '1' THEN 'ชาย' WHEN '2' THEN 'หญิง' ELSE 'ไม่ระบุ' END AS gender,
      COALESCE(NULLIF(p.mobile, ''), NULLIF(p.telephoneperson, '')) AS phone,
      h.hno AS houseNo,
      v.villno AS villageNo,
      v.villname AS villageName,
      h.xgis AS latRaw,
      h.ygis AS lngRaw,
      COUNT(DISTINCT pc.chroniccode) AS chronicCount,
      IF(pu.pid IS NULL, 0, 1) AS bedridden,
      GROUP_CONCAT(
        DISTINCT CONCAT(pc.chroniccode, ' ', COALESCE(cd.diseasenamethai, cd.diseasename, pc.chroniccode))
        ORDER BY pc.chroniccode
        SEPARATOR '; '
      ) AS chronicDiseases
    FROM person p
    LEFT JOIN house h ON h.pcucode = p.pcucodeperson AND h.hcode = p.hcode
    LEFT JOIN village v ON v.pcucode = h.pcucode AND v.villcode = h.villcode
    LEFT JOIN personchronic pc ON pc.pcucodeperson = p.pcucodeperson AND pc.pid = p.pid
    LEFT JOIN cdisease cd ON cd.diseasecode = pc.chroniccode
    LEFT JOIN personunable pu ON pu.pcucodeperson = p.pcucodeperson AND pu.pid = p.pid
    WHERE ${where.join(' AND ')}
    GROUP BY p.pcucodeperson, p.pid, p.idcard, p.fname, p.lname, p.birth, p.sex, p.mobile,
      p.telephoneperson, h.hno, v.villno, v.villname, h.xgis, h.ygis, pu.pid
    ORDER BY v.villno ASC, h.hno ASC, p.fname ASC
    LIMIT 50000`,
    params
  )

  return rows.map((row) => {
    const coord = normalizeJhcisCoordinate(row.latRaw, row.lngRaw)
    const elderlyCount = Number(row.age || 0) >= 60 ? 1 : 0
    return {
      CID: row.cid || '',
      'ชื่อ-นามสกุล': row.fullName || '',
      อายุ: row.age ?? '',
      เพศ: row.gender,
      โทรศัพท์: row.phone || '',
      บ้านเลขที่: row.houseNo || '',
      หมู่: row.villageNo ?? '',
      หมู่บ้าน: row.villageName || '',
      โรคเรื้อรัง: row.chronicDiseases || '',
      ติดเตียง: row.bedridden ? 'ใช่' : 'ไม่ใช่',
      ระดับความเสี่ยง: riskFromHouseFactors({
        bedriddenCount: row.bedridden,
        chronicCount: row.chronicCount,
        elderlyCount,
      }),
      ละติจูด: coord.lat ?? '',
      ลองจิจูด: coord.lng ?? '',
    }
  })
}

async function getChronicSummaryRows(filters: ReportFilters) {
  const where = ['pc.chroniccode IS NOT NULL']
  const params: unknown[] = []

  if (filters.villageId) {
    where.push('h.villcode = ?')
    params.push(filters.villageId)
  }
  if (filters.chronicCode) {
    where.push('pc.chroniccode = ?')
    params.push(filters.chronicCode)
  }

  type ChronicRow = RowDataPacket & {
    diseaseCode: string
    diseaseName: string | null
    maleCount: number
    femaleCount: number
    age0_14: number
    age15_59: number
    age60Plus: number
    total: number
  }

  const rows = await jhcisQuery<ChronicRow>(
    `SELECT
      pc.chroniccode AS diseaseCode,
      COALESCE(cd.diseasenamethai, cd.diseasename, pc.chroniccode) AS diseaseName,
      COUNT(DISTINCT CONCAT(pc.pcucodeperson, ':', pc.pid)) AS total,
      COUNT(DISTINCT CASE WHEN p.sex = '1' THEN CONCAT(pc.pcucodeperson, ':', pc.pid) END) AS maleCount,
      COUNT(DISTINCT CASE WHEN p.sex = '2' THEN CONCAT(pc.pcucodeperson, ':', pc.pid) END) AS femaleCount,
      COUNT(DISTINCT CASE WHEN TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) BETWEEN 0 AND 14 THEN CONCAT(pc.pcucodeperson, ':', pc.pid) END) AS age0_14,
      COUNT(DISTINCT CASE WHEN TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) BETWEEN 15 AND 59 THEN CONCAT(pc.pcucodeperson, ':', pc.pid) END) AS age15_59,
      COUNT(DISTINCT CASE WHEN TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) >= 60 THEN CONCAT(pc.pcucodeperson, ':', pc.pid) END) AS age60Plus
    FROM personchronic pc
    LEFT JOIN person p ON p.pcucodeperson = pc.pcucodeperson AND p.pid = pc.pid
    LEFT JOIN house h ON h.pcucode = p.pcucodeperson AND h.hcode = p.hcode
    LEFT JOIN cdisease cd ON cd.diseasecode = pc.chroniccode
    WHERE ${where.join(' AND ')}
    GROUP BY pc.chroniccode, cd.diseasenamethai, cd.diseasename
    ORDER BY total DESC`,
    params
  )

  return rows.map((row) => ({
    รหัสโรค: row.diseaseCode,
    ชื่อโรค: row.diseaseName || row.diseaseCode,
    รวม: Number(row.total || 0),
    ชาย: Number(row.maleCount || 0),
    หญิง: Number(row.femaleCount || 0),
    'อายุ 0-14': Number(row.age0_14 || 0),
    'อายุ 15-59': Number(row.age15_59 || 0),
    'อายุ 60+': Number(row.age60Plus || 0),
  }))
}

async function getFfcRows(filters: ReportFilters) {
  const where = ['1=1']
  const params: unknown[] = []
  const dateSql = dateRangeSql('vt.visitdate', filters.dateRange)
  if (dateSql) where.push(dateSql)
  if (filters.villageId) {
    where.push('h.villcode = ?')
    params.push(filters.villageId)
  }
  if (filters.chronicCode) {
    where.push('EXISTS (SELECT 1 FROM personchronic pcx WHERE pcx.pcucodeperson = p.pcucodeperson AND pcx.pid = p.pid AND pcx.chroniccode = ?)')
    params.push(filters.chronicCode)
  }

  type FfcRow = RowDataPacket & {
    visitDate: Date | string | null
    visitNo: string
    patientName: string | null
    age: number | null
    gender: string
    houseNo: string | null
    villageName: string | null
    symptoms: string | null
    pressure: string | null
    pressure2: string | null
    weight: number | null
    username: string | null
    latRaw: string | null
    lngRaw: string | null
  }

  const rows = await jhcisQuery<FfcRow>(
    `SELECT
      vt.visitdate AS visitDate,
      vt.visitno AS visitNo,
      NULLIF(TRIM(CONCAT(COALESCE(p.fname, ''), ' ', COALESCE(p.lname, ''))), '') AS patientName,
      TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) AS age,
      CASE p.sex WHEN '1' THEN 'ชาย' WHEN '2' THEN 'หญิง' ELSE 'ไม่ระบุ' END AS gender,
      h.hno AS houseNo,
      v.villname AS villageName,
      vt.symptoms,
      vt.pressure,
      vt.pressure2,
      vt.weight,
      vt.username,
      h.xgis AS latRaw,
      h.ygis AS lngRaw
    FROM visit vt
    LEFT JOIN person p ON p.pcucodeperson = vt.pcucodeperson AND p.pid = vt.pid
    LEFT JOIN house h ON h.pcucode = p.pcucodeperson AND h.hcode = p.hcode
    LEFT JOIN village v ON v.pcucode = h.pcucode AND v.villcode = h.villcode
    WHERE ${where.join(' AND ')}
    ORDER BY vt.visitdate DESC, vt.timestart DESC
    LIMIT 50000`,
    params
  )

  return rows.map((row) => {
    const coord = normalizeJhcisCoordinate(row.latRaw, row.lngRaw)
    return {
      วันที่เยี่ยม: row.visitDate ? new Date(row.visitDate).toISOString().slice(0, 10) : '',
      เลขที่บริการ: row.visitNo,
      ผู้ป่วย: row.patientName || '',
      อายุ: row.age ?? '',
      เพศ: row.gender,
      บ้านเลขที่: row.houseNo || '',
      หมู่บ้าน: row.villageName || '',
      อาการ: row.symptoms || '',
      ความดัน: [row.pressure, row.pressure2].filter(Boolean).join('/'),
      น้ำหนัก: row.weight ?? '',
      ผู้บันทึก: row.username || '',
      ละติจูด: coord.lat ?? '',
      ลองจิจูด: coord.lng ?? '',
    }
  })
}

async function getVillageRows(filters: ReportFilters) {
  const where = ['1=1']
  const params: unknown[] = []
  if (filters.villageId) {
    where.push('v.villcode = ?')
    params.push(filters.villageId)
  }

  type VillageRow = RowDataPacket & {
    villageNo: number | null
    villageName: string | null
    houseCount: number
    populationCount: number
    chronicCount: number
    bedriddenCount: number
    elderlyCount: number
  }

  const rows = await jhcisQuery<VillageRow>(
    `SELECT
      v.villno AS villageNo,
      v.villname AS villageName,
      COUNT(DISTINCT h.hcode) AS houseCount,
      COUNT(DISTINCT p.pid) AS populationCount,
      COUNT(DISTINCT pc.pid) AS chronicCount,
      COUNT(DISTINCT pu.pid) AS bedriddenCount,
      COUNT(DISTINCT CASE WHEN TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) >= 60 THEN p.pid END) AS elderlyCount
    FROM village v
    LEFT JOIN house h ON h.pcucode = v.pcucode AND h.villcode = v.villcode
    LEFT JOIN person p ON p.pcucodeperson = h.pcucode AND p.hcode = h.hcode
    LEFT JOIN personchronic pc ON pc.pcucodeperson = p.pcucodeperson AND pc.pid = p.pid
    LEFT JOIN personunable pu ON pu.pcucodeperson = p.pcucodeperson AND pu.pid = p.pid
    WHERE ${where.join(' AND ')}
    GROUP BY v.villcode, v.villno, v.villname
    ORDER BY v.villno ASC`,
    params
  )

  return rows.map((row) => ({
    หมู่: row.villageNo ?? '',
    หมู่บ้าน: row.villageName || '',
    จำนวนบ้าน: Number(row.houseCount || 0),
    ประชากร: Number(row.populationCount || 0),
    โรคเรื้อรัง: Number(row.chronicCount || 0),
    ติดเตียง: Number(row.bedriddenCount || 0),
    'ผู้สูงอายุ 60+': Number(row.elderlyCount || 0),
  }))
}

async function getRows(type: ReportType, filters: ReportFilters) {
  if (type === 'patient-list') return getPatientRows(filters)
  if (type === 'chronic-summary') return getChronicSummaryRows(filters)
  if (type === 'ffc-report') return getFfcRows(filters)
  return getVillageRows(filters)
}

function rowsToGeoJson(rows: Record<string, unknown>[], type: ReportType) {
  const features = rows.flatMap((row) => {
    const lat = Number(row['ละติจูด'])
    const lng = Number(row['ลองจิจูด'])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []
    return [{
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lng, lat] },
      properties: row,
    }]
  })

  return {
    type: 'FeatureCollection' as const,
    name: type,
    features,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const type = body.type as ReportType | undefined
    const format = (body.format || 'csv') as ExportFormat
    const filters = (body.filters || {}) as ReportFilters

    const validTypes: ReportType[] = ['patient-list', 'chronic-summary', 'ffc-report', 'village-report']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `Invalid report type. Must be one of: ${validTypes.join(', ')}` } },
        { status: 400 }
      )
    }

    const validFormats: ExportFormat[] = ['excel', 'csv', 'geojson']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `Invalid format. Must be one of: ${validFormats.join(', ')}` } },
        { status: 400 }
      )
    }

    const rows = await getRows(type, filters)
    const today = new Date().toISOString().split('T')[0]
    const extension = format === 'excel' ? 'xls' : format
    const fileName = `${type}-${today}.${extension}`

    if (format === 'geojson') {
      const content = JSON.stringify(rowsToGeoJson(rows, type), null, 2)
      const buffer = Buffer.from(content, 'utf-8')
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/geo+json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': String(buffer.length),
        },
      })
    }

    const content = toCsv(rows)
    const buffer = Buffer.from(content, 'utf-8')
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': format === 'excel' ? 'application/vnd.ms-excel; charset=utf-8' : 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error) {
    console.error('POST /api/v1/reports/export error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to export report from JHCIS' } },
      { status: 500 }
    )
  }
}
