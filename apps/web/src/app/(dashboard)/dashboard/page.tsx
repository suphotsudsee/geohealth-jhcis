'use client'

import StatsCards from '@/components/dashboard/StatsCards'
import DiseaseChart, { type DiseaseData } from '@/components/dashboard/DiseaseChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Users, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'

async function fetchDashboardStats() {
  const res = await fetch('/api/v1/analytics/dashboard')
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to fetch dashboard stats')
  }
  return json.data
}

async function fetchDiseaseData() {
  const res = await fetch('/api/v1/analytics/diseases')
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to fetch disease data')
  }
  return json.data
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })

  const { data: diseaseData } = useQuery({
    queryKey: ['disease-data'],
    queryFn: fetchDiseaseData,
  })

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">ภาพรวมข้อมูลสุขภาพ</h1>
        <p className="text-sm text-muted-foreground">
          สถิติและข้อมูลเชิงวิเคราะห์ของประชากรในพื้นที่
        </p>
      </div>

      {/* Stats cards */}
      <StatsCards
        stats={
          stats
            ? {
                totalPopulation: stats.totalPopulation,
                totalChronic: stats.totalChronic,
                totalBedridden: stats.totalBedridden,
                totalRisk: stats.totalRisk,
                ffcToday: stats.ffcToday,
              }
            : undefined
        }
        isLoading={statsLoading}
      />

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2">
          <DiseaseChart
            data={diseaseData || []}
            onDiseaseSelect={(disease: DiseaseData) => {
              router.push(`/?disease=${encodeURIComponent(disease.name)}`)
            }}
          />
        </div>

        {/* Quick stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สถิติเพิ่มเติม</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>หมู่บ้านที่ครอบคลุม</span>
              </div>
              <span className="font-bold">
                {stats ? `${stats.coveredVillages}/${stats.totalVillages}` : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>ผู้ป่วยที่ติดตาม</span>
              </div>
              <span className="font-bold">
                {stats?.totalChronic?.toLocaleString() || '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>เยี่ยมบ้านเดือนนี้</span>
              </div>
              <span className="font-bold">
                {stats?.ffcThisMonth?.toLocaleString() || '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
