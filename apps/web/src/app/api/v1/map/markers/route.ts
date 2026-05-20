import { NextRequest, NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2/promise'
import { jhcisHouseId, jhcisQuery, normalizeJhcisCoordinate, riskFromHouseFactors } from '@/lib/jhcis'
import type { MarkerData } from '@/types/api'

export const runtime = 'nodejs'

type MarkerRow = RowDataPacket & {
  pcucode: string
  hcode: number
  houseNo: string | null
  xgis: string | null
  ygis: string | null
  villageName: string | null
  peopleCount: number
  chronicCount: number
  elderlyCount: number
  bedriddenCount: number
  ffcTodayCount: number
  residentNames: string | null
  residentDetails: string | null
}

function genderLabelFromJhcis(sex: unknown) {
  if (String(sex) === '1') return 'ชาย'
  if (String(sex) === '2') return 'หญิง'
  return 'ไม่ระบุ'
}

function parseResidentDetails(details: string | null) {
  if (!details) return []

  return details
    .split('\n')
    .map((item) => {
      const [name, age, genderCode, chronicFlag, bedriddenFlag, chronicDiseases] = item.split('\t')
      return {
        name: name || '-',
        age: age ? Number(age) : null,
        gender: genderLabelFromJhcis(genderCode),
        chronicDisease: chronicFlag === '1',
        bedridden: bedriddenFlag === '1',
        chronicDiseases: chronicDiseases
          ? chronicDiseases
              .split('||')
              .map((disease) => disease.trim())
              .filter(Boolean)
          : [],
      }
    })
    .filter((resident) => resident.name !== '-')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const villageId = searchParams.get('villageId')
    const chronicCode = searchParams.get('chronicCode')?.trim()

    const where = ["COALESCE(h.xgis, '') <> ''", "COALESCE(h.ygis, '') <> ''"]
    const whereParams: unknown[] = []
    if (villageId) {
      where.push('h.villcode = ?')
      whereParams.push(villageId)
    }
    if (chronicCode) {
      where.push(
        `EXISTS (
          SELECT 1
          FROM person px
          INNER JOIN personchronic pcx ON pcx.pcucodeperson = px.pcucodeperson AND pcx.pid = px.pid
          WHERE px.pcucodeperson = h.pcucode AND px.hcode = h.hcode AND pcx.chroniccode = ?
        )`
      )
      whereParams.push(chronicCode)
    }

    const chronicJoinCondition = chronicCode
      ? 'pc.pcucodeperson = p.pcucodeperson AND pc.pid = p.pid AND pc.chroniccode = ?'
      : 'pc.pcucodeperson = p.pcucodeperson AND pc.pid = p.pid'
    const params = chronicCode ? [chronicCode, ...whereParams] : whereParams

    const rows = await jhcisQuery<MarkerRow>(
      `SELECT
        h.pcucode,
        h.hcode,
        h.hno AS houseNo,
        h.xgis,
        h.ygis,
        v.villname AS villageName,
        COUNT(DISTINCT p.pid) AS peopleCount,
        COUNT(DISTINCT pc.pid) AS chronicCount,
        COUNT(DISTINCT CASE WHEN TIMESTAMPDIFF(YEAR, p.birth, CURDATE()) >= 60 THEN p.pid END) AS elderlyCount,
        COUNT(DISTINCT pu.pid) AS bedriddenCount,
        COUNT(DISTINCT CONCAT(vt.pcucode, ':', vt.visitno)) AS ffcTodayCount,
        GROUP_CONCAT(
          DISTINCT NULLIF(TRIM(CONCAT(COALESCE(p.fname, ''), ' ', COALESCE(p.lname, ''))), '')
          ORDER BY p.fname, p.lname
          SEPARATOR ', '
        ) AS residentNames,
        GROUP_CONCAT(
          DISTINCT CONCAT_WS(
            '\t',
            NULLIF(TRIM(CONCAT(COALESCE(p.fname, ''), ' ', COALESCE(p.lname, ''))), ''),
            COALESCE(TIMESTAMPDIFF(YEAR, p.birth, CURDATE()), ''),
            COALESCE(p.sex, ''),
            IF(pc.pid IS NULL, '0', '1'),
            IF(pu.pid IS NULL, '0', '1'),
            COALESCE((
              SELECT GROUP_CONCAT(
                DISTINCT CONCAT(pc2.chroniccode, ' ', COALESCE(cd.diseasenamethai, cd.diseasename, pc2.chroniccode))
                ORDER BY pc2.chroniccode
                SEPARATOR '||'
              )
              FROM personchronic pc2
              LEFT JOIN cdisease cd ON cd.diseasecode = pc2.chroniccode
              WHERE pc2.pcucodeperson = p.pcucodeperson AND pc2.pid = p.pid
            ), '')
          )
          ORDER BY p.fname, p.lname
          SEPARATOR '\n'
        ) AS residentDetails
      FROM house h
      LEFT JOIN village v ON v.pcucode = h.pcucode AND v.villcode = h.villcode
      LEFT JOIN person p ON p.pcucodeperson = h.pcucode AND p.hcode = h.hcode
      LEFT JOIN personchronic pc ON ${chronicJoinCondition}
      LEFT JOIN personunable pu ON pu.pcucodeperson = p.pcucodeperson AND pu.pid = p.pid
      LEFT JOIN visit vt ON vt.pcucodeperson = p.pcucodeperson AND vt.pid = p.pid AND vt.visitdate = CURDATE()
      WHERE ${where.join(' AND ')}
      GROUP BY h.pcucode, h.hcode, h.hno, h.xgis, h.ygis, v.villname
      LIMIT 10000`,
      params
    )

    const markers: MarkerData[] = rows.flatMap((row) => {
      const coord = normalizeJhcisCoordinate(row.xgis, row.ygis)
      if (coord.lat === null || coord.lng === null) return []

      const houseId = jhcisHouseId(row.pcucode, row.hcode)
      const chronicCount = Number(row.chronicCount || 0)
      const elderlyCount = Number(row.elderlyCount || 0)
      const bedriddenCount = Number(row.bedriddenCount || 0)
      const ffcTodayCount = Number(row.ffcTodayCount || 0)

      return [{
        id: houseId,
        lat: coord.lat,
        lng: coord.lng,
        type: 'house' as const,
        riskLevel: riskFromHouseFactors({ bedriddenCount, chronicCount, elderlyCount }) as MarkerData['riskLevel'],
        label: `บ้านเลขที่ ${row.houseNo || '-'}`,
        popupData: {
          houseId,
          chronicDisease: chronicCount > 0,
          bedridden: bedriddenCount > 0,
          ffcToday: ffcTodayCount > 0,
          houseNo: row.houseNo,
          villageName: row.villageName,
          peopleCount: Number(row.peopleCount || 0),
          chronicCount,
          elderlyCount,
          bedriddenCount,
          ffcTodayCount,
          residentNames: row.residentNames,
          residents: parseResidentDetails(row.residentDetails),
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
