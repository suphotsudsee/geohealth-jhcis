'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import StatsCards, { type StatCardFilter } from '@/components/dashboard/StatsCards'
import { useMapStore } from '@/stores/map.store'
import type { MarkerData } from '@/types/api'
import { Activity, Bed, Circle, HeartPulse, Home, Layers, Map, Search, Square, Users, X } from 'lucide-react'

// Lazy load the map component since Leaflet is browser-only
const MapView = dynamic(
  () => import('@/components/map/MapView').catch(() => () => null),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Map className="h-8 w-8 animate-pulse" />
          <span className="text-sm">กำลังโหลดแผนที่...</span>
        </div>
      </div>
    ),
  }
)

const MapCluster = dynamic(
  () => import('@/components/map/MapCluster').catch(() => () => null),
  { ssr: false }
)

const filterLabels: Record<StatCardFilter, string> = {
  population: 'ประชากรทั้งหมด',
  chronic: 'โรคเรื้อรัง',
  bedridden: 'ติดเตียง',
  risk: 'กลุ่มเสี่ยง',
  ffcToday: 'FFC วันนี้',
}

function markerCount(value: unknown) {
  const count = Number(value || 0)
  return Number.isFinite(count) ? count.toLocaleString() : '0'
}

function markerText(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function markerResidents(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.flatMap((resident) => {
    if (!resident || typeof resident !== 'object') return []
    const data = resident as Record<string, unknown>
    return [{
      name: markerText(data.name),
      age: data.age === null || data.age === undefined ? null : Number(data.age),
      chronicDisease: data.chronicDisease === true,
      bedridden: data.bedridden === true,
      gender: markerText(data.gender, 'ไม่ระบุ'),
    }]
  })
}

function riskBadgeVariant(riskLevel: string) {
  return riskLevel === 'NORMAL' ? 'secondary' : 'destructive'
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<StatCardFilter>('population')
  const [selectedHouseMarker, setSelectedHouseMarker] = useState<MarkerData | null>(null)
  const [stats, setStats] = useState<{totalPopulation: number; totalChronic: number; totalBedridden: number; totalRisk: number; ffcToday: number} | undefined>(undefined)
  const [markers, setMarkers] = useState<MarkerData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const activeLayers = useMapStore((s) => s.activeLayers)
  const toggleLayer = useMapStore((s) => s.toggleLayer)
  const setLayerActive = useMapStore((s) => s.setLayerActive)

  useEffect(() => {
    fetch('/api/v1/analytics/dashboard')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setStats(json.data)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/v1/map/markers')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setMarkers(json.data)
      })
      .catch(console.error)
  }, [])

  const filteredMarkers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return markers.filter((marker) => {
      const data = marker.popupData || {}
      const matchesFilter =
        activeFilter === 'population' ||
        (activeFilter === 'chronic' && data.chronicDisease === true) ||
        (activeFilter === 'bedridden' && data.bedridden === true) ||
        (activeFilter === 'risk' && marker.riskLevel !== 'NORMAL') ||
        (activeFilter === 'ffcToday' && data.ffcToday === true)

      if (!matchesFilter) return false
      if (!normalizedQuery) return true

      return [
        marker.label,
        data.houseNo,
        data.villageName,
        data.residentNames,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
  }, [activeFilter, markers, searchQuery])

  const selectStatsFilter = (filter: StatCardFilter) => {
    setActiveFilter((current) => (current === filter ? 'population' : filter))
    setLayerActive('markers', true)
  }

  const selectedHouseData = selectedHouseMarker?.popupData || {}
  const selectedResidents = markerResidents(selectedHouseData.residents)

  return (
    <div className="relative flex h-full flex-col">
      {/* Stats bar - hidden on mobile */}
      <div className="hidden md:block">
        <div className="px-4 pt-4">
          <StatsCards
            stats={stats}
            isLoading={isLoading}
            activeFilter={activeFilter}
            onFilterSelect={selectStatsFilter}
          />
        </div>
      </div>

      {/* Map area */}
      <div className="relative flex-1">
        <MapView>
          {activeLayers.includes('markers') && (
            <MapCluster
              markers={filteredMarkers}
              fitBoundsOnLoad
              fitBoundsKey={`${activeFilter}:${searchQuery}:${filteredMarkers.length}`}
              onMarkerClick={setSelectedHouseMarker}
            />
          )}
        </MapView>

        {/* Search overlay */}
        <div className="absolute left-4 right-4 top-4 z-[1000] md:left-6 md:right-auto md:w-80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหาตำแหน่ง..."
              className="pl-9 bg-background/95 backdrop-blur shadow-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card className="absolute right-4 top-20 z-[1000] md:right-6 md:top-4">
          <CardContent className="flex items-center gap-2 p-2 pl-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">
                {filterLabels[activeFilter]}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {filteredMarkers.length.toLocaleString()} จุดบนแผนที่
              </p>
            </div>
            {activeFilter !== 'population' || searchQuery ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setActiveFilter('population')
                  setSearchQuery('')
                }}
                aria-label="ล้างตัวกรอง"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* Layer control */}
        <Card className="absolute bottom-4 right-4 z-[1000] hidden w-48 md:block">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Layers className="h-4 w-4" />
              <span>ชั้นข้อมูล</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'markers', label: 'เครื่องหมาย', icon: 'circle' },
                { id: 'villages', label: 'หมู่บ้าน', icon: 'square' },
                { id: 'heatmap', label: 'Heatmap', icon: 'circle' },
                { id: 'clusters', label: 'กลุ่มโรค', icon: 'square' },
              ].map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id)}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    activeLayers.includes(layer.id)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {layer.icon === 'circle' ? (
                    <Circle className="h-3 w-3" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                  {layer.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="absolute bottom-4 left-4 z-[1000] hidden md:block">
          <CardContent className="p-3">
            <p className="text-xs font-medium mb-1.5">คำอธิบาย</p>
            <div className="flex flex-col gap-1">
              {[
                { color: '#ef4444', label: 'วิกฤติ' },
                { color: '#f97316', label: 'สูง' },
                { color: '#eab308', label: 'ปานกลาง' },
                { color: '#22c55e', label: 'ปกติ' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={selectedHouseMarker !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setSelectedHouseMarker(null)
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-start gap-3 pr-8">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Home className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate">
                  {selectedHouseMarker?.label || 'ข้อมูลหลังคาเรือน'}
                </DialogTitle>
                <DialogDescription>
                  {markerText(selectedHouseData.villageName)}
                </DialogDescription>
              </div>
              {selectedHouseMarker ? (
                <Badge variant={riskBadgeVariant(selectedHouseMarker.riskLevel)}>
                  {selectedHouseMarker.riskLevel}
                </Badge>
              ) : null}
            </div>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">จำนวนคนในบ้าน</p>
                  <p className="text-xl font-bold">
                    {markerCount(selectedHouseData.peopleCount)} คน
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <HeartPulse className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-xs text-muted-foreground">โรคเรื้อรัง</p>
                  <p className="text-xl font-bold">
                    {markerCount(selectedHouseData.chronicCount)} คน
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Bed className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">ติดเตียง</p>
                  <p className="text-xl font-bold">
                    {markerCount(selectedHouseData.bedriddenCount)} คน
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Activity className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">FFC วันนี้</p>
                  <p className="text-xl font-bold">
                    {markerCount(selectedHouseData.ffcTodayCount)} ครั้ง
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-md border p-4">
            <div className="grid gap-2 text-sm sm:grid-cols-[120px_1fr]">
              <span className="text-muted-foreground">รหัสหลังคาเรือน</span>
              <span className="font-medium">{markerText(selectedHouseData.houseId)}</span>
              <span className="text-muted-foreground">บ้านเลขที่</span>
              <span className="font-medium">{markerText(selectedHouseData.houseNo)}</span>
              <span className="text-muted-foreground">พิกัด</span>
              <span className="font-medium">
                {selectedHouseMarker
                  ? `${selectedHouseMarker.lat.toFixed(6)}, ${selectedHouseMarker.lng.toFixed(6)}`
                  : '-'}
              </span>
            </div>
          </div>

          {selectedResidents.length > 0 ? (
            <div className="rounded-md border p-4">
              <p className="mb-2 text-sm font-medium">สมาชิกในบ้าน</p>
              <div className="divide-y">
                {selectedResidents.map((resident, index) => (
                  <div
                    key={`${resident.name}-${index}`}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{resident.name}</p>
                      {resident.chronicDisease || resident.bedridden ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {resident.chronicDisease ? (
                            <Badge variant="destructive" className="px-2 py-0 text-[10px]">
                              โรคเรื้อรัง
                            </Badge>
                          ) : null}
                          {resident.bedridden ? (
                            <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                              ติดเตียง
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <span className="text-muted-foreground">
                      {resident.age === null || Number.isNaN(resident.age)
                        ? 'ไม่ระบุอายุ'
                        : `${resident.age.toLocaleString()} ปี`}
                    </span>
                    <Badge variant="outline">{resident.gender}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
