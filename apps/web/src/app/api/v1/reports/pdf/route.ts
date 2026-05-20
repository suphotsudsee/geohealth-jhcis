import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function parseCsvLine(line: string) {
  const fields: string[] = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields
}

function csvToHtmlTable(csv: string) {
  const lines = csv.replace(/^\ufeff/, '').split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return '<p class="empty">ไม่มีข้อมูล</p>'

  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map(parseCsvLine)

  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>${headers.map((_, index) => `<td>${escapeHtml(row[index] || '')}</td>`).join('')}</tr>
        `).join('')}
      </tbody>
    </table>
  `
}

const reportTitles: Record<string, string> = {
  'patient-list': 'รายชื่อผู้ป่วย',
  'chronic-summary': 'สรุปโรคเรื้อรัง',
  'ffc-report': 'รายงาน FFC',
  'village-report': 'รายงานหมู่บ้าน',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, filters = {} } = body
    const validTypes = ['patient-list', 'chronic-summary', 'ffc-report', 'village-report']

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `Invalid report type. Must be one of: ${validTypes.join(', ')}` } },
        { status: 400 }
      )
    }

    const exportResponse = await fetch(new URL('/api/v1/reports/export', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, format: 'csv', filters }),
    })

    if (!exportResponse.ok) {
      const error = await exportResponse.json().catch(() => null)
      return NextResponse.json(
        { success: false, error: { code: 'EXPORT_ERROR', message: error?.error?.message || 'Failed to fetch report data' } },
        { status: exportResponse.status }
      )
    }

    const csv = await exportResponse.text()
    const title = reportTitles[type] || type
    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .meta { margin: 0 0 16px; color: #64748b; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #e2e8f0; text-align: left; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .empty { color: #64748b; }
    @media print {
      body { margin: 12mm; }
      table { font-size: 9px; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">สร้างเมื่อ ${new Date().toLocaleString('th-TH')} | ใช้คำสั่งพิมพ์ของเบราว์เซอร์เพื่อบันทึกเป็น PDF</p>
  ${csvToHtmlTable(csv)}
</body>
</html>`

    const buffer = Buffer.from(html, 'utf-8')
    const fileName = `${type}-${new Date().toISOString().split('T')[0]}.html`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error) {
    console.error('POST /api/v1/reports/pdf error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate printable report' } },
      { status: 500 }
    )
  }
}
