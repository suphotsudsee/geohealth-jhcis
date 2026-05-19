'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import StatsCards from '@/components/dashboard/StatsCards'
import { useMapStore } from '@/stores/map.store'
import { Map, Search, Layers, Circle, Square } from 'lucide-react'

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

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const activeLayers = useMapStore((s) => s.activeLayers)
  const toggleLayer = useMapStore((s) => s.toggleLayer)

  return (
    <div className="relative flex h-full flex-col">
      {/* Stats bar - hidden on mobile */}
      <div className="hidden md:block">
        <div className="px-4 pt-4">
          <StatsCards />
        </div>
      </div>

      {/* Map area */}
      <div className="relative flex-1">
        <MapView />

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
    </div>
  )
}
