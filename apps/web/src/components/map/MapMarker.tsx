'use client'

import { useCallback } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { cn } from '@/lib/utils'
import { getRiskColor } from '@/lib/utils'

// ── Risk-level color mapping ──
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL'

export interface MapMarkerProps {
  id: string
  position: [number, number]
  riskLevel: string
  label?: string
  onClick?: (id: string) => void
  popupContent?: React.ReactNode
  selected?: boolean
}

/**
 * Creates a custom Leaflet DivIcon with a colored circle.
 */
function createRiskIcon(riskLevel: string, selected: boolean = false): L.DivIcon {
  const color = getRiskColor(riskLevel)
  const size = selected ? 18 : 14
  const borderWidth = selected ? 3 : 2

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${color};
      border:${borderWidth}px solid white;
      box-shadow:${selected ? '0 0 12px rgba(0,0,0,0.4)' : '0 0 4px rgba(0,0,0,0.3)'};
      transition: all 0.15s ease;
      cursor:pointer;
    "></div>`,
    iconSize: [size + borderWidth * 2, size + borderWidth * 2],
    iconAnchor: [(size + borderWidth * 2) / 2, (size + borderWidth * 2) / 2],
    popupAnchor: [0, -(size + borderWidth * 2 + 4)],
  })
}

/**
 * MapMarker — colored circle marker based on risk level.
 */
export default function MapMarker({
  id,
  position,
  riskLevel,
  label,
  onClick,
  popupContent,
  selected = false,
}: MapMarkerProps) {
  const handleClick = useCallback(() => {
    onClick?.(id)
  }, [id, onClick])

  const icon = createRiskIcon(riskLevel, selected)

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{ click: handleClick }}
    >
      {popupContent ? (
        <Popup>
          <div className="min-w-[160px]">
            {label && (
              <p className="mb-1 text-sm font-semibold">{label}</p>
            )}
            <div className="text-xs text-muted-foreground">{popupContent}</div>
          </div>
        </Popup>
      ) : label ? (
        <Popup>
          <span className="text-sm">{label}</span>
        </Popup>
      ) : null}
    </Marker>
  )
}
