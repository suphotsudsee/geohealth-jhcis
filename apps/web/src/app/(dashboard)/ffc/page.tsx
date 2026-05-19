'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import VisitForm from '@/components/ffc/VisitForm'
import VisitList from '@/components/ffc/VisitList'
import OfflineIndicator from '@/components/ffc/OfflineIndicator'
import { useFFCStore } from '@/stores/ffc.store'
import { formatDate } from '@/lib/utils'
import {
  Plus,
  ClipboardCheck,
  Clock,
  WifiOff,
  Calendar,
  Users,
  Loader2,
} from 'lucide-react'

export default function FFCDashboardPage() {
  const [formOpen, setFormOpen] = useState(false)
  const pendingVisits = useFFCStore((s) => s.pendingVisits)
  const pendingCount = pendingVisits.length

  // Fetch today's schedule count
  const todayQuery = useQuery({
    queryKey: ['ffc-today-count'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ffc/schedule')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to fetch schedule')
      return json.data as any[]
    },
    refetchInterval: 60000,
  })

  // Fetch recent visits
  const visitsQuery = useQuery({
    queryKey: ['ffc-visits-recent'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ffc/visits?limit=20&sort=visitDate&order=desc')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to fetch visits')
      return json
    },
  })

  // Fetch pending offline visits status
  const syncAll = useCallback(async () => {
    if (pendingVisits.length === 0) return
    try {
      const res = await fetch('/api/v1/ffc/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visits: pendingVisits }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        const { synced } = json.data
        if (synced && synced.length > 0) {
          synced.forEach((id: string) => {
            useFFCStore.getState().removeSynced(id)
          })
        }
      }
    } catch {
      // silent fail — will retry later
    }
  }, [pendingVisits])

  // Auto-sync when online
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && pendingVisits.length > 0) {
        syncAll()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [syncAll, pendingVisits.length])

  const todayCount = todayQuery.data?.length || 0
  const totalVisits = visitsQuery.data?.pagination?.total || 0
  const recentVisits = visitsQuery.data?.data || []

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FFC Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            จัดการการเยี่ยมบ้านของผู้ป่วย
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OfflineIndicator />
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            สร้างการเยี่ยมใหม่
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              วันนี้
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">
                {todayQuery.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  todayCount
                )}
              </span>
              <span className="text-xs text-muted-foreground">นัด</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ทั้งหมด
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{totalVisits}</span>
              <span className="text-xs text-muted-foreground">ครั้ง</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              รอซิงค์
            </CardTitle>
            <WifiOff className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{pendingCount}</span>
              <span className="text-xs text-muted-foreground">รายการ</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ผู้ป่วย
            </CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">
                {new Set(recentVisits.map((v: any) => v.patientId)).size}
              </span>
              <span className="text-xs text-muted-foreground">คน</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            วันนี้
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            ทั้งหมด
          </TabsTrigger>
          <TabsTrigger value="offline" className="gap-1.5">
            <WifiOff className="h-4 w-4" />
            ออฟไลน์
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">ตารางวันนี้</CardTitle>
              {todayCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/ffc/schedule'}
                >
                  ดูทั้งหมด
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <VisitList
                visits={todayQuery.data || []}
                isLoading={todayQuery.isLoading}
                emptyMessage="ไม่มีนัดเยี่ยมวันนี้"
                emptyDescription="ยังไม่มีรายการเยี่ยมบ้านสำหรับวันนี้"
                showFilters={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ประวัติการเยี่ยมทั้งหมด</CardTitle>
            </CardHeader>
            <CardContent>
              <VisitList
                visits={recentVisits}
                isLoading={visitsQuery.isLoading}
                emptyMessage="ยังไม่มีประวัติการเยี่ยม"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                รายการออฟไลน์ ({pendingCount})
              </CardTitle>
              {pendingCount > 0 && navigator.onLine && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncAll}
                >
                  ซิงค์ทั้งหมด
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {pendingCount > 0 ? (
                <div className="space-y-3">
                  {pendingVisits.map((visit) => (
                    <Card key={visit.offlineId} className="border-yellow-200 dark:border-yellow-800">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              ผู้ป่วย: {visit.patientId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(visit.visitDate)} — {visit.visitType}
                            </p>
                            {visit.photos && visit.photos.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                รูปถ่าย {visit.photos.length} รูป
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="border-yellow-500 text-yellow-600"
                          >
                            รอซิงค์
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  ไม่มีรายการที่รอซิงค์
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Visit Form Dialog */}
      <VisitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          todayQuery.refetch()
          visitsQuery.refetch()
        }}
      />
    </div>
  )
}
