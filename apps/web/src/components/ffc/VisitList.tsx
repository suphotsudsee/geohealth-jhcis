// @ts-nocheck
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import EmptyState from '@/components/shared/EmptyState'
import { VISIT_TYPES, VISIT_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import {
  Calendar,
  Clock,
  User,
  Home,
  MapPin,
  ChevronDown,
  ChevronUp,
  Filter,
  ClipboardList,
} from 'lucide-react'

interface VisitListVisit {
  id: string
  patient: {
    id: string
    fullName: string
    cid?: string | null
    age?: number | null
    gender?: string | null
    riskLevel: string
  }
  house?: {
    id: string
    houseNo?: string | null
    address?: string | null
    village?: { name?: string | null } | null
  } | null
  user?: { id: string; displayName: string } | null
  visitDate: string
  visitType: string
  status: string
  notes?: string | null
  nextVisitDate?: string | null
  checklist?: string | null
}

interface VisitListProps {
  visits: VisitListVisit[]
  isLoading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  onFilterChange?: (filters: { status: string; dateFrom: string; dateTo: string }) => void
  showFilters?: boolean
}

const statusColors: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  PLANNED: { variant: 'outline', label: 'วางแผน' },
  IN_PROGRESS: { variant: 'secondary', label: 'กำลังดำเนินการ' },
  COMPLETED: { variant: 'default', label: 'เสร็จสิ้น' },
  CANCELLED: { variant: 'outline', label: 'ยกเลิก' },
  MISSED: { variant: 'destructive', label: 'พลาดนัด' },
}

const visitTypeLabels: Record<string, string> = {
  ROUTINE: 'เยี่ยมปกติ',
  FOLLOW_UP: 'ติดตามผล',
  EMERGENCY: 'ฉุกเฉิน',
  ASSESSMENT: 'ประเมินสภาพ',
  OTHER: 'อื่นๆ',
}

export default function VisitList({
  visits,
  isLoading,
  emptyMessage = 'ไม่พบรายการเยี่ยม',
  emptyDescription,
  onFilterChange,
  showFilters = true,
}: VisitListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const handleFilterChange = (status: string, dateFrom: string, dateTo: string) => {
    onFilterChange?.({ status, dateFrom, dateTo })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-40 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-4 w-32 rounded bg-muted" />
                </div>
                <div className="h-6 w-16 rounded-full bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!visits || visits.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={48} />}
        message={emptyMessage}
        description={emptyDescription || 'ยังไม่มีประวัติการเยี่ยมบ้าน'}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">สถานะ</label>
            <Select
              value={filterStatus}
              onValueChange={(v) => {
                setFilterStatus(v)
                handleFilterChange(v, filterDateFrom, filterDateTo)
              }}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {VISIT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusColors[s]?.label || s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">จากวันที่</label>
            <Input
              type="date"
              className="h-8 w-36"
              value={filterDateFrom}
              onChange={(e) => {
                setFilterDateFrom(e.target.value)
                handleFilterChange(filterStatus, e.target.value, filterDateTo)
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">ถึงวันที่</label>
            <Input
              type="date"
              className="h-8 w-36"
              value={filterDateTo}
              onChange={(e) => {
                setFilterDateTo(e.target.value)
                handleFilterChange(filterStatus, filterDateFrom, e.target.value)
              }}
            />
          </div>
          {(filterStatus !== 'all' || filterDateFrom || filterDateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setFilterStatus('all')
                setFilterDateFrom('')
                setFilterDateTo('')
                handleFilterChange('all', '', '')
              }}
            >
              ล้าง
            </Button>
          )}
        </div>
      )}

      {/* Visit cards */}
      <div className="space-y-3">
        {visits.map((visit) => {
          const statusInfo = statusColors[visit.status] || {
            variant: 'outline' as const,
            label: visit.status,
          }
          const isExpanded = expandedId === visit.id
          let checklistData: Record<string, unknown> = {}
          try {
            if (visit.checklist) checklistData = JSON.parse(visit.checklist)
          } catch {
            // ignore parse errors
          }

          return (
            <Card
              key={visit.id}
              className="cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => setExpandedId(isExpanded ? null : visit.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">
                        {visit.patient.fullName}
                      </span>
                      {visit.patient.riskLevel === 'CRITICAL' && (
                        <Badge variant="destructive" className="text-[10px]">
                          CRITICAL
                        </Badge>
                      )}
                      {visit.patient.riskLevel === 'HIGH' && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-[10px]">
                          HIGH
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(visit.visitDate)}
                      </span>
                      <span>{visitTypeLabels[visit.visitType] || visit.visitType}</span>
                      {visit.house?.houseNo && (
                        <span className="flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          บ้าน {visit.house.houseNo}
                        </span>
                      )}
                      {visit.house?.village?.name && (
                        <span>หมู่ {visit.house.village.name}</span>
                      )}
                      {visit.patient.age !== null && visit.patient.age !== undefined && (
                        <span>อายุ {visit.patient.age} ปี</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusInfo.variant} className="shrink-0">
                      {statusInfo.label}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    {/* Notes */}
                    {visit.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">บันทึก</p>
                        <p className="text-sm">{visit.notes}</p>
                      </div>
                    )}

                    {/* Checklist summary */}
                    {Object.keys(checklistData).length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">ข้อมูลสุขภาพ</p>
                        <div className="grid grid-cols-2 gap-1 text-sm">
                          {Object.entries(checklistData).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <span className="text-xs font-medium">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next visit */}
                    {visit.nextVisitDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        นัดครั้งต่อไป: {formatDate(visit.nextVisitDate)}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/patients/${visit.patient.id}`}>
                          ดูผู้ป่วย
                        </Link>
                      </Button>
                      {visit.status !== 'COMPLETED' && visit.status !== 'CANCELLED' && (
                        <Link
                          href={`/ffc/schedule?visitId=${visit.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm">
                            เริ่มเยี่ยม
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
