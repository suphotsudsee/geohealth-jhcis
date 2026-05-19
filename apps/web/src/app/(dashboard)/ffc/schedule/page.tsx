'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import VisitForm from '@/components/ffc/VisitForm'
import { formatDate } from '@/lib/utils'
import {
  MapPin,
  RefreshCw,
  Play,
  User,
  Home,
  Clock,
  AlertTriangle,
  Compass,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

interface ScheduleVisit {
  id: string
  patient: {
    id: string
    fullName: string
    cid?: string | null
    age?: number | null
    gender?: string | null
    riskLevel: string
    lat?: number | null
    lng?: number | null
    phone?: string | null
  }
  house?: {
    id: string
    houseNo?: string | null
    moo?: number | null
    address?: string | null
    lat?: number | null
    lng?: number | null
    village?: { name?: string | null; code?: string | null } | null
  } | null
  visitDate: string
  visitType: string
  status: string
}

const riskLabels: Record<string, string> = {
  CRITICAL: 'วิกฤต',
  HIGH: 'สูง',
  MEDIUM: 'ปานกลาง',
  NORMAL: 'ปกติ',
}

const visitTypeLabels: Record<string, string> = {
  ROUTINE: 'เยี่ยมปกติ',
  FOLLOW_UP: 'ติดตามผล',
  EMERGENCY: 'ฉุกเฉิน',
  ASSESSMENT: 'ประเมินสภาพ',
  OTHER: 'อื่นๆ',
}

const statusLabels: Record<string, string> = {
  PLANNED: 'วางแผน',
  IN_PROGRESS: 'กำลังดำเนินการ',
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function FFCSchedulePage() {
  const [formOpen, setFormOpen] = useState(false)
  const [selectedVisitId, setSelectedVisitId] = useState<string | undefined>()
  const [userLat, setUserLat] = useState<number | undefined>()
  const [userLng, setUserLng] = useState<number | undefined>()
  const [gpsLoaded, setGpsLoaded] = useState(false)

  const { data: visits, isLoading, refetch } = useQuery({
    queryKey: ['ffc-schedule'],
    queryFn: async () => {
      const res = await fetch('/api/v1/ffc/schedule')
      const json = await res.json()
      if (!json.success) throw new Error('Failed to fetch schedule')
      return json.data as ScheduleVisit[]
    },
    refetchInterval: 60000,
  })

  // Get user GPS location
  const getUserLocation = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLat(position.coords.latitude)
        setUserLng(position.coords.longitude)
        setGpsLoaded(true)
      },
      () => {
        setGpsLoaded(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Sort by distance (if GPS available), then by priority (EMERGENCY first)
  const sortedVisits = useMemo(() => {
    if (!visits) return []

    return [...visits].sort((a, b) => {
      // Emergency first
      if (a.visitType === 'EMERGENCY' && b.visitType !== 'EMERGENCY') return -1
      if (a.visitType !== 'EMERGENCY' && b.visitType === 'EMERGENCY') return 1

      // In progress before planned
      if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1
      if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1

      // Sort by distance if GPS available
      if (userLat && userLng) {
        const distA = a.house?.lat && a.house?.lng
          ? calculateDistance(userLat, userLng, a.house.lat, a.house.lng)
          : a.patient.lat && a.patient.lng
          ? calculateDistance(userLat, userLng, a.patient.lat, a.patient.lng)
          : Infinity
        const distB = b.house?.lat && b.house?.lng
          ? calculateDistance(userLat, userLng, b.house.lat, b.house.lng)
          : b.patient.lat && b.patient.lng
          ? calculateDistance(userLat, userLng, b.patient.lat, b.patient.lng)
          : Infinity
        return distA - distB
      }

      // Fallback to visit date
      return new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
    })
  }, [visits, userLat, userLng])

  const handleStartVisit = (visitId: string) => {
    setSelectedVisitId(visitId)
    setFormOpen(true)
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ffc">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ตารางเยี่ยมวันนี้</h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(new Date().toISOString())}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {userLat && userLng && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Compass className="h-3 w-3" />
              {userLat.toFixed(4)}, {userLng.toFixed(4)}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={getUserLocation}
            disabled={gpsLoaded && !!userLat}
          >
            <MapPin className="mr-1 h-4 w-4" />
            {userLat ? 'ตำแหน่ง GPS' : 'ระบุ GPS'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Schedule list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-5 w-48 rounded bg-muted" />
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-4 w-40 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-24 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !sortedVisits || sortedVisits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Clock className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">ไม่มีนัดเยี่ยมวันนี้</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ท่านสามารถสร้างการเยี่ยมใหม่ได้ที่หน้ารวม
            </p>
            <Link href="/ffc">
              <Button variant="outline" className="mt-4">
                กลับไป FFC Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedVisits.map((visit) => {
            const riskColor =
              visit.patient.riskLevel === 'CRITICAL'
                ? '#ef4444'
                : visit.patient.riskLevel === 'HIGH'
                ? '#f97316'
                : visit.patient.riskLevel === 'MEDIUM'
                ? '#eab308'
                : '#22c55e'

            const isEmergency = visit.visitType === 'EMERGENCY'

            let distance: number | null = null
            if (userLat && userLng) {
              const targetLat = visit.house?.lat || visit.patient.lat
              const targetLng = visit.house?.lng || visit.patient.lng
              if (targetLat && targetLng) {
                distance = calculateDistance(userLat, userLng, targetLat, targetLng)
              }
            }

            return (
              <Card
                key={visit.id}
                className={`transition-colors hover:bg-accent/50 ${
                  isEmergency ? 'border-red-200 dark:border-red-800' : ''
                } ${visit.status === 'IN_PROGRESS' ? 'border-blue-200 dark:border-blue-800' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-base font-medium">
                          {visit.patient.fullName}
                        </span>
                        {visit.patient.riskLevel !== 'NORMAL' && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: riskColor }}
                            title={riskLabels[visit.patient.riskLevel]}
                          />
                        )}
                        {isEmergency && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            ฉุกเฉิน
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          {visit.house?.houseNo
                            ? `บ้าน ${visit.house.houseNo}`
                            : 'ไม่มีบ้าน'}
                          {visit.house?.village?.name && (
                            <> หมู่ {visit.house.village.name}</>
                          )}
                        </span>
                        {visit.patient.age !== null && visit.patient.age !== undefined && (
                          <span>อายุ {visit.patient.age} ปี</span>
                        )}
                        {visit.patient.phone && (
                          <span>โทร {visit.patient.phone}</span>
                        )}
                        <span>{visitTypeLabels[visit.visitType] || visit.visitType}</span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <Badge
                          variant={visit.status === 'IN_PROGRESS' ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {statusLabels[visit.status] || visit.status}
                        </Badge>
                        {distance !== null && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {distance < 1
                              ? `${(distance * 1000).toFixed(0)} ม.`
                              : `${distance.toFixed(1)} กม.`}
                          </span>
                        )}
                        {visit.house?.address && (
                          <span className="truncate max-w-[200px]">{visit.house.address}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {visit.status === 'PLANNED' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartVisit(visit.id)}
                        >
                          <Play className="mr-1 h-4 w-4" />
                          เริ่มเยี่ยม
                        </Button>
                      )}
                      {visit.status === 'IN_PROGRESS' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleStartVisit(visit.id)}
                        >
                          ดำเนินการต่อ
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Visit Form Dialog */}
      <VisitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          refetch()
        }}
      />
    </div>
  )
}
