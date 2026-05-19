'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import { SYNC_INTERVALS } from '@/lib/constants'
import {
  Database, Shield, RefreshCw, Clock, CheckCircle2,
  XCircle, AlertCircle, Activity, Calendar, List,
  Play, ExternalLink
} from 'lucide-react'

interface SyncTableStatus {
  tableName: string
  status: string
  lastSyncAt: string
  completedAt: string | null
  recordCount: number
  error: string | null
  durationMs: number | null
}

interface SyncLogEntry {
  id: string
  tableName: string
  action: string
  status: string
  recordCount: number
  startedAt: string
  completedAt: string | null
  error: string | null
  durationMs: number | null
}

const TABLE_LABELS: Record<string, string> = {
  ALL: 'ทั้งหมด',
  Patient: 'ผู้ป่วย',
  House: 'บ้าน',
  ChronicRecord: 'โรคเรื้อรัง',
  VisitRecord: 'ประวัติการรักษา',
  LabResult: 'ผลตรวจ',
  DrugRecord: 'ยา',
  FFCVisit: 'การเยี่ยมบ้าน FFC',
  Village: 'หมู่บ้าน',
  SubDistrict: 'ตำบล',
  District: 'อำเภอ',
  Province: 'จังหวัด',
}

function getTableLabel(name: string): string {
  return TABLE_LABELS[name] || name
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-'
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} วิ`
  return `${Math.floor(ms / 60000)} นาที ${Math.round((ms % 60000) / 1000)} วิ`
}

function formatSyncDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminSyncPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [scheduleInterval, setScheduleInterval] = useState('0 */6 * * *')
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      router.push('/admin')
    }
  }, [user, router])

  // Sync status per table
  const { data: syncStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['admin-sync-status'],
    queryFn: async () => {
      const res = await fetch('/api/v1/sync/status')
      if (!res.ok) throw new Error('Failed to fetch sync status')
      const json = await res.json()
      return json.data as { tables: SyncTableStatus[]; running: number; hasRunningSync: boolean }
    },
    enabled: user?.role === 'ADMIN',
    refetchInterval: 15000,
  })

  // Sync log history
  const { data: syncLogData, isLoading: logLoading } = useQuery({
    queryKey: ['admin-sync-logs'],
    queryFn: async () => {
      const res = await fetch('/api/v1/sync/logs')
      if (!res.ok) return { data: [] }
      const json = await res.json()
      return json as { data: SyncLogEntry[] }
    },
    enabled: user?.role === 'ADMIN',
  })

  // Trigger sync
  const syncMutation = useMutation({
    mutationFn: async (tableName?: string) => {
      const res = await fetch('/api/v1/sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName: tableName || null }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Failed to start sync')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('เริ่มการซิงค์ข้อมูล', {
        description: `Sync ID: ${data.data?.id?.slice(0, 8)}...`,
      })
      setTimeout(() => {
        refetchStatus()
        queryClient.invalidateQueries({ queryKey: ['admin-sync-logs'] })
      }, 2000)
    },
    onError: (error) => {
      toast.error('เริ่มซิงค์ไม่สำเร็จ', { description: error.message })
    },
  })

  const tables = syncStatus?.tables || []
  const syncLogs: SyncLogEntry[] = syncLogData?.data || []
  const isSyncing = syncMutation.isPending || syncStatus?.hasRunningSync

  if (user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4">
        <Shield className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">ไม่มีสิทธิ์เข้าถึง</h2>
        <p className="text-sm text-muted-foreground">เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้น</p>
        <Button onClick={() => router.push('/admin')}>กลับ</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">การซิงค์ข้อมูล</h1>
          <p className="text-sm text-muted-foreground">
            จัดการการซิงค์ข้อมูลระหว่าง GeoHealth และ JHCIS
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetchStatus()}
            disabled={statusLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          <Button
            onClick={() => syncMutation.mutate(undefined)}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> กำลังซิงค์...</>
            ) : (
              <><Play className="mr-2 h-4 w-4" /> ซิงค์ทั้งหมด</>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status per Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              สถานะการซิงค์แยกตามตาราง
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Database className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการซิงค์</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => syncMutation.mutate(undefined)}>
                  <Play className="mr-2 h-4 w-4" />
                  เริ่มซิงค์
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tables.map((t) => (
                  <div key={t.tableName} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{getTableLabel(t.tableName)}</span>
                        <span className="text-xs text-muted-foreground">({t.tableName})</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          ล่าสุด: {formatSyncDate(t.lastSyncAt)}
                        </span>
                        {t.recordCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {t.recordCount.toLocaleString()} records
                          </span>
                        )}
                        {t.durationMs !== null && (
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(t.durationMs)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {t.status === 'SUCCESS' ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          สำเร็จ
                        </Badge>
                      ) : t.status === 'RUNNING' ? (
                        <Badge variant="secondary">
                          <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          กำลังซิงค์
                        </Badge>
                      ) : t.status === 'FAILED' ? (
                        <Badge variant="destructive" title={t.error || ''}>
                          <AlertCircle className="mr-1 h-3 w-3" />
                          ล้มเหลว
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {t.status}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={isSyncing}
                        onClick={() => syncMutation.mutate(t.tableName)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {tables.some(t => t.status === 'FAILED') && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>บางตารางซิงค์ไม่สำเร็จ กรุณาตรวจสอบและลองอีกครั้ง</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              กำหนดการซิงค์อัตโนมัติ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>ซิงค์อัตโนมัติ</Label>
                <p className="text-xs text-muted-foreground">เปิด/ปิดการซิงค์ตามกำหนดการ</p>
              </div>
              <Switch checked={autoSyncEnabled} onCheckedChange={setAutoSyncEnabled} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>ความถี่</Label>
              <Select value={scheduleInterval} onValueChange={setScheduleInterval} disabled={!autoSyncEnabled}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกความถี่" />
                </SelectTrigger>
                <SelectContent>
                  {SYNC_INTERVALS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">สถานะ</p>
              {autoSyncEnabled ? (
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>
                    เปิดใช้งาน · {SYNC_INTERVALS.find(i => i.value === scheduleInterval)?.label || scheduleInterval}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  <span>ปิดใช้งาน</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Log History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <List className="h-4 w-4" />
            ประวัติการซิงค์
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : syncLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">ไม่มีประวัติการซิงค์</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ตาราง</TableHead>
                    <TableHead>การกระทำ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>จำนวน records</TableHead>
                    <TableHead>ระยะเวลา</TableHead>
                    <TableHead>เริ่มต้น</TableHead>
                    <TableHead>สิ้นสุด</TableHead>
                    <TableHead>ข้อผิดพลาด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.slice(0, 50).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">
                        {getTableLabel(log.tableName)}
                      </TableCell>
                      <TableCell className="text-xs">{log.action}</TableCell>
                      <TableCell>
                        {log.status === 'SUCCESS' ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            สำเร็จ
                          </Badge>
                        ) : log.status === 'RUNNING' ? (
                          <Badge variant="secondary">
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                            กำลังทำงาน
                          </Badge>
                        ) : log.status === 'FAILED' ? (
                          <Badge variant="destructive">
                            <XCircle className="mr-1 h-3 w-3" />
                            ล้มเหลว
                          </Badge>
                        ) : (
                          <Badge variant="outline">{log.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{log.recordCount.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDuration(log.durationMs)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatSyncDate(log.startedAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatSyncDate(log.completedAt)}
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate" title={log.error || ''}>
                        {log.error || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {syncStatus && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">ตารางที่ซิงค์: </span>
                <span className="font-semibold">{tables.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">สำเร็จ: </span>
                <span className="font-semibold">{tables.filter(t => t.status === 'SUCCESS').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">ล้มเหลว: </span>
                <span className="font-semibold">{tables.filter(t => t.status === 'FAILED').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">กำลังทำงาน: </span>
                <span className="font-semibold">{syncStatus.running}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
