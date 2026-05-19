import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { ApiResponse } from '@/types/api'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  try {
    // Group SyncLog by tableName and get latest status per table
    const syncLogs = await prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 1000,
    })

    // Build latest status per table
    const tableMap = new Map<string, typeof syncLogs[0]>()

    for (const log of syncLogs) {
      const key = log.tableName
      if (!tableMap.has(key)) {
        tableMap.set(key, log)
      }
    }

    // Count running syncs
    const runningSyncs = syncLogs.filter((l) => l.status === 'RUNNING')

    const tables = Array.from(tableMap.entries()).map(([tableName, latest]) => ({
      tableName,
      status: latest.status,
      lastSyncAt: latest.startedAt,
      completedAt: latest.completedAt,
      recordCount: latest.recordCount,
      error: latest.error,
      durationMs: latest.durationMs,
    }))

    const response: ApiResponse = {
      success: true,
      data: {
        tables,
        running: runningSyncs.length,
        hasRunningSync: runningSyncs.length > 0,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/v1/sync/status error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch sync status' } },
      { status: 500 }
    )
  }
}
