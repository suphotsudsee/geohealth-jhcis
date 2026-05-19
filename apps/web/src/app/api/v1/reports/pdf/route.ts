import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

function generatePatientListHtml(filters: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>รายชื่อผู้ป่วย</title>
<style>
  body { font-family: 'Sarabun', sans-serif; padding: 20px; }
  h1 { color: #1a1a2e; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #1e293b; color: white; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .footer { margin-top: 24px; font-size: 12px; color: #64748b; text-align: center; }
</style></head>
<body>
  <h1>รายชื่อผู้ป่วย — GeoHealth</h1>
  <p>วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}</p>
  <p>เงื่อนไข: ${JSON.stringify(filters)}</p>
  <table><thead><tr>
    <th>ลำดับ</th><th>CID</th><th>HN</th><th>ชื่อ-นามสกุล</th><th>อายุ</th><th>เพศ</th><th>ระดับความเสี่ยง</th>
  </tr></thead><tbody>
    <tr><td colspan="7" style="text-align:center;color:#94a3b8;">กรุณารันรายงานผ่านระบบจริง</td></tr>
  </tbody></table>
  <div class="footer">GeoHealth-JHCIS · รายงานสร้างโดยระบบอัตโนมัติ</div>
</body></html>`
}

function generateChronicSummaryHtml(filters: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>สรุปโรคเรื้อรัง</title>
<style>
  body { font-family: 'Sarabun', sans-serif; padding: 20px; }
  h1 { color: #1a1a2e; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 16px 0; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
  .card h3 { margin: 0; font-size: 14px; color: #64748b; }
  .card .value { font-size: 28px; font-weight: bold; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #1e293b; color: white; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
</style></head>
<body>
  <h1>สรุปโรคเรื้อรัง</h1>
  <p>วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}</p>
  <p>เงื่อนไข: ${JSON.stringify(filters)}</p>
  <p style="color:#94a3b8;">กรุณารันรายงานผ่านระบบจริง</p>
  <div class="footer" style="margin-top:24px;font-size:12px;color:#64748b;text-align:center;">GeoHealth-JHCIS</div>
</body></html>`
}

function generateFfcReportHtml(filters: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>รายงาน FFC</title>
<style>
  body { font-family: 'Sarabun', sans-serif; padding: 20px; }
  h1 { color: #1a1a2e; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
</style></head>
<body>
  <h1>รายงานการเยี่ยมบ้าน (FFC)</h1>
  <p>วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}</p>
  <p>เงื่อนไข: ${JSON.stringify(filters)}</p>
  <p style="color:#94a3b8;">กรุณารันรายงานผ่านระบบจริง</p>
  <div class="footer" style="margin-top:24px;font-size:12px;color:#64748b;text-align:center;">GeoHealth-JHCIS</div>
</body></html>`
}

function generateVillageReportHtml(filters: Record<string, unknown>): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>รายงานหมู่บ้าน</title>
<style>
  body { font-family: 'Sarabun', sans-serif; padding: 20px; }
  h1 { color: #1a1a2e; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
</style></head>
<body>
  <h1>รายงานข้อมูลหมู่บ้าน</h1>
  <p>วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}</p>
  <p>เงื่อนไข: ${JSON.stringify(filters)}</p>
  <p style="color:#94a3b8;">กรุณารันรายงานผ่านระบบจริง</p>
  <div class="footer" style="margin-top:24px;font-size:12px;color:#64748b;text-align:center;">GeoHealth-JHCIS</div>
</body></html>`
}

function getReportHtml(type: string, filters: Record<string, unknown>): string {
  switch (type) {
    case 'patient-list':
      return generatePatientListHtml(filters)
    case 'chronic-summary':
      return generateChronicSummaryHtml(filters)
    case 'ffc-report':
      return generateFfcReportHtml(filters)
    case 'village-report':
      return generateVillageReportHtml(filters)
    default:
      return `<html><body><h1>Unknown report type: ${type}</h1></body></html>`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, filters = {}, format = 'pdf' } = body

    if (!type) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required field: type' },
      }
      return NextResponse.json(response, { status: 400 })
    }

    const validTypes = ['patient-list', 'chronic-summary', 'ffc-report', 'village-report']
    if (!validTypes.includes(type)) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Invalid report type. Must be one of: ${validTypes.join(', ')}` },
      }
      return NextResponse.json(response, { status: 400 })
    }

    if (format !== 'pdf') {
      const response: ApiResponse = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'This endpoint only supports PDF format' },
      }
      return NextResponse.json(response, { status: 400 })
    }

    const html = getReportHtml(type, filters as Record<string, unknown>)

    // Placeholder: return HTML as buffer — real PDF generation (puppeteer) would be wired here
    const buffer = Buffer.from(html, 'utf-8')

    const fileName = `${type}-${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error) {
    console.error('POST /api/v1/reports/pdf error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate PDF report' } },
      { status: 500 }
    )
  }
}
