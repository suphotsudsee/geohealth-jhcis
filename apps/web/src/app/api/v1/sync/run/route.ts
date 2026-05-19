import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

function isAdmin(request: NextRequest): boolean {
  const role = request.headers.get('x-user-role')
  return role === 'ADMIN'
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const tableName = body.tableName || null

    const log = await prisma.syncLog.create({
      data: {
        tableName: tableName || 'ALL',
        action: 'FULL_SYNC',
        status: 'RUNNING',
        recordCount: 0,
        startedAt: new Date(),
      },
    })

    // In a real implementation, this would trigger an async sync process.
    // For now, we create the log entry and return the sync ID for tracking.
    const response: ApiResponse = {
      success: true,
      data: {
        id: log.id,
        tableName: log.tableName,
        status: log.status,
        startedAt: log.startedAt,
        message: 'Sync initiated. Poll /api/v1/sync/status for progress.',
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('POST /api/v1/sync/run error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to trigger sync' } },
      { status: 500 }
    )
  }
}
