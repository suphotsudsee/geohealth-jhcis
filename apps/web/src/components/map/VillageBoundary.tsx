'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

// ── Props ──
export interface VillageBoundaryProps {
  /** GeoJSON FeatureCollection for village boundaries */
  geoJSONData: GeoJSON.FeatureCollection
  /** Optional style function per feature */
  style?: L.PathOptions | ((feature?: GeoJSON.Feature) => L.PathOptions)
  /** Called when a feature is clicked */
  onEachFeature?: (feature: GeoJSON.Feature, layer: L.Layer) => void
  /** Visible toggle */
  visible?: boolean
}

const DEFAULT_STYLE: L.PathOptions = {
  color: '#3b82f6',
  weight: 2,
  opacity: 0.8,
  fillColor: '#3b82f6',
  fillOpacity: 0.08,
}

const HIGHLIGHT_STYLE: L.PathOptions = {
  weight: 3,
  color: '#1d4ed8',
  fillOpacity: 0.15,
}

/**
 * VillageBoundary — renders GeoJSON village boundaries on the map.
 * Supports hover highlight, click events, and visibility toggling.
 */
export default function VillageBoundary({
  geoJSONData,
  style = DEFAULT_STYLE,
  onEachFeature,
  visible = true,
}: VillageBoundaryProps) {
  const map = useMap()
  const layerRef = useRef<L.GeoJSON | null>(null)

  useEffect(() => {
    // Cleanup previous layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }

    if (!visible || !geoJSONData) return

    const resolvedStyle =
      typeof style === 'function'
        ? (feature?: GeoJSON.Feature) => style(feature)
        : () => style

    const geoLayer = L.geoJSON(geoJSONData, {
      style: resolvedStyle,
      onEachFeature: (feature, layer) => {
        // Default interactions: hover highlight
        layer.on({
          mouseover: (e) => {
            const target = e.target as L.Path
            target.setStyle(HIGHLIGHT_STYLE)
            target.bindTooltip(
              feature.properties?.name
                ? `หมู่บ้าน: ${feature.properties.name}`
                : 'หมู่บ้าน',
              { sticky: true },
            )
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              target.bringToFront()
            }
          },
          mouseout: (e) => {
            const target = e.target as L.Path
            target.setStyle(resolvedStyle(feature))
            target.unbindTooltip()
          },
        })

        // User-provided per-feature handler
        if (onEachFeature) {
          onEachFeature(feature, layer)
        }
      },
    })

    layerRef.current = geoLayer
    geoLayer.addTo(map)

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map, geoJSONData, style, onEachFeature, visible])

  return null
}
