'use client'

import type React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Users,
  HeartPulse,
  Bed,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react'

interface StatsCardsProps {
  stats?: {
    totalPopulation: number
    totalChronic: number
    totalBedridden: number
    totalRisk: number
    ffcToday: number
  }
  isLoading?: boolean
  activeFilter?: StatCardFilter | null
  onFilterSelect?: (filter: StatCardFilter) => void
}

export type StatCardFilter = 'population' | 'chronic' | 'bedridden' | 'risk' | 'ffcToday'

interface StatItem {
  id: StatCardFilter
  label: string
  value: number
  icon: React.ReactNode
  color: string
}

export default function StatsCards({
  stats,
  isLoading,
  activeFilter,
  onFilterSelect,
}: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const items: StatItem[] = [
    {
      label: 'ประชากร',
      id: 'population',
      value: stats?.totalPopulation ?? 0,
      icon: <Users className="h-5 w-5" />,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-950',
    },
    {
      label: 'โรคเรื้อรัง',
      id: 'chronic',
      value: stats?.totalChronic ?? 0,
      icon: <HeartPulse className="h-5 w-5" />,
      color: 'text-red-600 bg-red-100 dark:bg-red-950',
    },
    {
      label: 'ติดเตียง',
      id: 'bedridden',
      value: stats?.totalBedridden ?? 0,
      icon: <Bed className="h-5 w-5" />,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-950',
    },
    {
      label: 'กลุ่มเสี่ยง',
      id: 'risk',
      value: stats?.totalRisk ?? 0,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-950',
    },
    {
      label: 'FFC วันนี้',
      id: 'ffcToday',
      value: stats?.ffcToday ?? 0,
      icon: <ClipboardCheck className="h-5 w-5" />,
      color: 'text-green-600 bg-green-100 dark:bg-green-950',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <Card
          key={item.id}
          role={onFilterSelect ? 'button' : undefined}
          tabIndex={onFilterSelect ? 0 : undefined}
          aria-pressed={onFilterSelect ? activeFilter === item.id : undefined}
          onClick={() => onFilterSelect?.(item.id)}
          onKeyDown={(event) => {
            if (!onFilterSelect) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onFilterSelect(item.id)
            }
          }}
          className={cn(
            onFilterSelect &&
              'cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeFilter === item.id && 'border-primary bg-primary/5 ring-1 ring-primary',
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
            <div className={`rounded-full p-1.5 ${item.color}`}>
              {item.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value.toLocaleString()}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
