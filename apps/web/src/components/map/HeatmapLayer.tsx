'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

// ── Props ──
export interface HeatmapPoint {
  lat: number
  lng: number
  intensity: number
}

export interface HeatmapLayerProps {
  points: HeatmapPoint[]
  radius?: number
  blur?: number
  maxZoom?: number
  max?: number
  gradient?: Record<number, string>
  visible?: boolean
}

const DEFAULT_GRADIENT: Record<number, string> = {
  0.0: 'blue',
  0.2: 'cyan',
  0.4: 'lime',
  0.6: 'yellow',
  0.8: 'orange',
  1.0: 'red',
}

/**
 * HeatmapLayer — renders a leaflet.heat heatmap layer over the map.
 * Adds/removes the heat layer reactively as points or visibility changes.
 */
export default function HeatmapLayer({
  points,
  radius = 25,
  blur = 15,
  maxZoom = 18,
  max = 1.0,
  gradient = DEFAULT_GRADIENT,
  visible = true,
}: HeatmapLayerProps) {
  const map = useMap()
  const heatLayerRef = useRef<any | null>(null)

  useEffect(() => {
    // Cleanup previous layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
      heatLayerRef.current = null
    }

    if (!visible || points.length === 0) return

    // Convert to [lat, lng, intensity] tuples
    const heatData: Array<[number, number, number]> = points.map((p) => [
      p.lat,
      p.lng,
      p.intensity,
    ])

    // @ts-ignore — leaflet.heat types are loose; L.heatLayer exists at runtime
    const layer = // @ts-ignore - leaflet.heat extends L with HeatLayer
      (L as any).heatLayer(heatData, {
      radius,
      blur,
      maxZoom,
      max,
      gradient,
      minOpacity: 0.3,
    })

    heatLayerRef.current = layer
    layer.addTo(map)

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current)
        heatLayerRef.current = null
      }
    }
  }, [map, points, radius, blur, maxZoom, max, gradient, visible])

  return null
}
