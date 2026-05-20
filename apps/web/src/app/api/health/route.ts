import { NextResponse } from 'next/server'
import { jhcisQuery } from '@/lib/jhcis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    databaseName: process.env.JHCIS_DB_NAME,
  }

  try {
    await jhcisQuery('SELECT 1 AS ok')
    checks.database = 'jhcisdb connected'
  } catch {
    checks.database = 'jhcisdb disconnected'
    checks.status = 'degraded'
  }

  const statusCode = checks.status === 'ok' ? 200 : 503
  return NextResponse.json(checks, { status: statusCode })
}
