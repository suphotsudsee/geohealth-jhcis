'use client'

import { useState } from 'react'
import { Layers, Eye, EyeOff } from 'lucide-react'
import type { MapLayer } from '@/types/map'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ── Props ──
export interface LayerControlProps {
  layers: MapLayer[]
  onToggle: (layerId: string) => void
  onChangeOpacity?: (layerId: string, opacity: number) => void
}

const LAYER_LABELS: Record<string, string> = {
  markers: 'จุดผู้ป่วย',
  villages: 'เขตหมู่บ้าน',
  heatmap: 'Heatmap ความหนาแน่น',
  satellite: 'ภาพถ่ายดาวเทียม',
}

/**
 * LayerControl — floating panel at bottom-right to toggle map layers
 * and adjust their opacity.
 */
export default function LayerControl({
  layers,
  onToggle,
  onChangeOpacity,
}: LayerControlProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
      <Card className="w-56 shadow-lg border-border/50">
        <CardHeader className="flex flex-row items-center justify-between p-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-muted-foreground" />
            ชั้นข้อมูล
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? '▶' : '▼'}
          </Button>
        </CardHeader>

        {!collapsed && (
          <CardContent className="space-y-2 p-3 pt-1">
            {layers.map((layer) => (
              <div key={layer.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground/80">
                    {LAYER_LABELS[layer.id] || layer.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggle(layer.id)}
                    className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                      layer.visible
                        ? 'text-primary hover:bg-primary/10'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                    title={layer.visible ? 'ซ่อนชั้น' : 'แสดงชั้น'}
                  >
                    {layer.visible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Opacity slider */}
                {layer.visible && onChangeOpacity && (
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={layer.opacity}
                    onChange={(e) =>
                      onChangeOpacity(layer.id, parseFloat(e.target.value))
                    }
                    className="h-1 w-full cursor-pointer appearance-none rounded bg-muted focus:outline-none
                      [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-primary"
                    aria-label={`ความโปร่งใสของ ${LAYER_LABELS[layer.id] || layer.name}`}
                  />
                )}
              </div>
            ))}

            {layers.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                ไม่มีชั้นข้อมูล
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
