'use client'

import { useState } from 'react'
import { Info, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { MapLegendItem } from '@/types/map'
import { DISEASE_COLORS } from '@/lib/constants'
import { getRiskColor } from '@/lib/utils'

// ── Risk level labels (Thai) ──
const RISK_LEVELS: MapLegendItem[] = [
  { label: 'วิกฤต (CRITICAL)', color: getRiskColor('CRITICAL'), type: 'circle' },
  { label: 'สูง (HIGH)', color: getRiskColor('HIGH'), type: 'circle' },
  { label: 'ปานกลาง (MEDIUM)', color: getRiskColor('MEDIUM'), type: 'circle' },
  { label: 'ปกติ (NORMAL)', color: getRiskColor('NORMAL'), type: 'circle' },
]

// ── Common disease legend items ──
const DISEASE_ITEMS: MapLegendItem[] = Object.entries(DISEASE_COLORS).map(
  ([disease, color]) => ({
    label: disease,
    color,
    type: 'square' as const,
  }),
)

// ── Props ──
export interface LegendProps {
  /** Additional custom legend items */
  items?: MapLegendItem[]
  /** Show disease colors (e.g. when heatmap is active) */
  showDiseaseColors?: boolean
  /** Collapsed by default */
  defaultCollapsed?: boolean
}

/**
 * Legend — floating card at bottom-left showing risk level colors
 * and optional disease colors.
 */
export default function Legend({
  items = [],
  showDiseaseColors = false,
  defaultCollapsed = false,
}: LegendProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const riskSection = RISK_LEVELS
  const diseaseSection = showDiseaseColors ? DISEASE_ITEMS : []
  const customSection = items

  const hasContent =
    riskSection.length > 0 || diseaseSection.length > 0 || customSection.length > 0

  return (
    <div className="absolute bottom-4 left-4 z-[1000]">
      <Card className="w-44 shadow-lg border-border/50">
        <CardHeader className="flex flex-row items-center justify-between p-2.5 pb-1.5">
          <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            สัญลักษณ์
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </CardHeader>

        {!collapsed && hasContent && (
          <CardContent className="space-y-2 p-2.5 pt-1">
            {/* Risk levels */}
            {riskSection.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  ระดับความเสี่ยง
                </p>
                <div className="space-y-1">
                  {riskSection.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="inline-block flex-shrink-0"
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: item.type === 'circle' ? '50%' : 2,
                          backgroundColor: item.color,
                        }}
                      />
                      <span className="text-[11px] text-foreground/80">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disease colors */}
            {diseaseSection.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  โรค
                </p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {diseaseSection.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        className="inline-block flex-shrink-0"
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: item.type === 'circle' ? '50%' : 2,
                          backgroundColor: item.color,
                        }}
                      />
                      <span className="text-[10px] text-foreground/70">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom items (e.g. village boundary, heatmap) */}
            {customSection.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  อื่นๆ
                </p>
                <div className="space-y-1">
                  {customSection.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="inline-block flex-shrink-0"
                        style={{
                          width: item.type === 'line' ? 14 : 10,
                          height: item.type === 'line' ? 3 : 10,
                          borderRadius:
                            item.type === 'circle'
                              ? '50%'
                              : item.type === 'square'
                                ? 2
                                : 0,
                          backgroundColor:
                            item.type === 'line' ? 'transparent' : item.color,
                          borderTop:
                            item.type === 'line'
                              ? `3px solid ${item.color}`
                              : 'none',
                        }}
                      />
                      <span className="text-[11px] text-foreground/80">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}

        {!collapsed && !hasContent && (
          <CardContent className="p-2.5 pt-0">
            <p className="py-2 text-center text-[11px] text-muted-foreground">
              ไม่มีสัญลักษณ์
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
