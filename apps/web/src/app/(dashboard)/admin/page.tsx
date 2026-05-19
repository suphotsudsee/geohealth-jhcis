'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth.store'
import { Users, Database, Settings, Shield, Activity, Clock, AlertCircle, CheckCircle2, RefreshCw, Server } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SyncStatus {
  tables: Array<{
    tableName: string
    status: string
    lastSyncAt: string
    completedAt: string | null
    recordCount: number
    error: string | null
    durationMs: number | null
  }>
  running: number
  hasRunningSync: boolean
}

interface AdminStats {
  totalUsers: number
  activeUsers: number
  syncStatus: SyncStatus | null
}

async function fetchUsers(): Promise<{ total: number; active: number }> {
  const res = await fetch('/api/v1/admin/users?limit=1')
  if (!res.ok) throw new Error('Failed to fetch users')
  const json = await res.json()
  return { total: json.pagination?.total || 0, active: 0 }
}

async function fetchSyncStatus(): Promise<SyncStatus | null> {
  try {
    const res = await fetch('/api/v1/sync/status')
    if (!res.ok) return null
    const json = await res.json()
    return json.data
  } catch {
    return null
  }
}

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  // Redirect if not admin
  if (user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4">
        <Shield className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">ไม่มีสิทธิ์เข้าถึง</h2>
        <p className="text-sm text-muted-foreground">
          เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถเข้าถึงหน้านี้ได้
        </p>
        <Button onClick={() => router.push('/dashboard')}>กลับไปหน้าแดชบอร์ด</Button>
      </div>
    )
  }

  const { data: userStats, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-stats'],
    queryFn: fetchUsers,
  })

  const { data: syncStatus, isLoading: syncLoading } = useQuery({
    queryKey: ['admin-sync-status'],
    queryFn: fetchSyncStatus,
    refetchInterval: 30000,
  })

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">จัดการระบบ</h1>
        <p className="text-sm text-muted-foreground">
          แผงควบคุมสำหรับผู้ดูแลระบบ
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ผู้ใช้ทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{userStats?.total || 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ซิงค์ล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            {syncLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">
                {syncStatus?.tables?.[0]?.lastSyncAt
                  ? new Date(syncStatus.tables[0].lastSyncAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                  : 'ไม่มี'}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ตารางที่ซิงค์</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{syncStatus?.tables?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ระบบ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="font-medium text-sm">ออนไลน์</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/users">
          <Card className="cursor-pointer transition-colors hover:bg-accent/50">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-blue-100 p-3 text-blue-600 dark:bg-blue-950">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">จัดการผู้ใช้</h3>
                <p className="text-sm text-muted-foreground">
                  {userStats?.total || 0} คน · {userStats?.active || 0} คน active
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/sync">
          <Card className="cursor-pointer transition-colors hover:bg-accent/50">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-amber-100 p-3 text-amber-600 dark:bg-amber-950">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">การซิงค์ข้อมูล</h3>
                <p className="text-sm text-muted-foreground">
                  {syncStatus?.hasRunningSync ? 'กำลังซิงค์...' : 'พร้อม'}{syncStatus?.tables?.length ? ` · ${syncStatus.tables.length} ตาราง` : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card className="cursor-default opacity-70">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-100 p-3 text-purple-600 dark:bg-purple-950">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">ตั้งค่าระบบ</h3>
              <p className="text-sm text-muted-foreground">กำลังพัฒนา</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            สถานะระบบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm">API Server</span>
              </div>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                ปกติ
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-green-500" />
                <span className="text-sm">Database</span>
              </div>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                ปกติ
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${syncStatus?.hasRunningSync ? 'text-amber-500 animate-spin' : 'text-green-500'}`} />
                <span className="text-sm">Sync Service</span>
              </div>
              {syncStatus?.hasRunningSync ? (
                <Badge variant="secondary">
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  กำลังทำงาน
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  ปกติ
                </Badge>
              )}
            </div>
            {syncStatus?.tables?.map((t) => (
              <div key={t.tableName} className="flex items-center justify-between pl-6">
                <span className="text-xs text-muted-foreground">{t.tableName}</span>
                <div className="flex items-center gap-2">
                  {t.status === 'SUCCESS' ? (
                    <Badge variant="outline" className="text-green-600 border-green-600 text-[10px]">
                      {t.recordCount} records
                    </Badge>
                  ) : t.status === 'FAILED' ? (
                    <Badge variant="destructive" className="text-[10px]">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      ล้มเหลว
                    </Badge>
                  ) : t.status === 'RUNNING' ? (
                    <Badge variant="secondary" className="text-[10px]">
                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      กำลังซิงค์
                    </Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
