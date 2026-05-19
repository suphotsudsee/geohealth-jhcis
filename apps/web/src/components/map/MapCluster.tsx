'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet/dist/leaflet.css'

import type { MarkerData } from '@/types/api'
import { useMapStore } from '@/stores/map.store'
import { getRiskColor } from '@/lib/utils'

// ── Custom cluster icon ──
function createClusterIcon(count: number): L.DivIcon {
  const size = Math.min(36 + count * 2, 56)
  return L.divIcon({
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:#3b82f6;
      border:3px solid rgba(255,255,255,0.9);
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:${size > 48 ? 13 : 11}px;
      font-weight:700;
      font-family:sans-serif;
    ">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// ── Helper: create a single marker ──
function createMarker(
  marker: MarkerData,
  onClick: (id: string) => void,
  selected: boolean,
): L.Marker {
  const color = getRiskColor(marker.riskLevel)
  const size = selected ? 18 : 14
  const borderW = selected ? 3 : 2

  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${color};
      border:${borderW}px solid white;
      box-shadow:${selected ? '0 0 12px rgba(0,0,0,0.45)' : '0 1px 4px rgba(0,0,0,0.3)'};
      cursor:pointer;
      transition:all 0.15s ease;
    "></div>`,
    iconSize: [size + borderW * 2, size + borderW * 2],
    iconAnchor: [(size + borderW * 2) / 2, (size + borderW * 2) / 2],
  })

  const popupHtml = `
    <div style="min-width:140px;">
      ${marker.label ? `<p style="margin:0 0 4px;font-weight:600;font-size:13px;">${marker.label}</p>` : ''}
      <p style="margin:0 0 2px;font-size:11px;color:#64748b;">
        ความเสี่ยง: <span style="color:${color};font-weight:600;">${marker.riskLevel}</span>
      </p>
      ${marker.popupData ? `<p style="margin:0;font-size:10px;color:#94a3b8;">${JSON.stringify(marker.popupData).replace(/["{}]/g, '')}</p>` : ''}
    </div>
  `

  const m = L.marker([marker.lat, marker.lng], { icon })
  m.bindPopup(popupHtml, { maxWidth: 300, className: '' })
  m.on('click', () => onClick(marker.id))
  return m
}

// ── Props ──
export interface MapClusterProps {
  markers: MarkerData[]
  maxClusterRadius?: number
  disableClusteringAtZoom?: number
}

/**
 * MapCluster — renders a MarkerClusterGroup with colored circle markers.
 * Uses plain Leaflet + MarkerClusterGroup directly on the map instance.
 */
export default function MapCluster({
  markers,
  maxClusterRadius = 50,
  disableClusteringAtZoom = 16,
}: MapClusterProps) {
  const map = useMap()
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)
  const selectMarker = useMapStore((s) => s.selectMarker)
  const selectedMarkerId = useMapStore((s) => s.selectedMarkerId)

  const handleClick = useCallback(
    (id: string) => {
      selectMarker(id)
    },
    [selectMarker],
  )

  // Create and add the cluster group once
  useEffect(() => {
    if (clusterGroupRef.current) return

    const group = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: maxClusterRadius as any,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom,
      spiderLegPolylineOptions: {
        weight: 1.5,
        color: '#94a3b8',
        opacity: 0.6,
      },
    })

    // Set custom icon function after creation
    ;(group as any).options.iconCreateFunction = (cluster: L.MarkerCluster) => {
      return createClusterIcon(cluster.getChildCount())
    }

    clusterGroupRef.current = group
    map.addLayer(group)

    return () => {
      map.removeLayer(group)
      clusterGroupRef.current = null
    }
  }, [map, maxClusterRadius, disableClusteringAtZoom])

  // Update markers when data changes
  useEffect(() => {
    const group = clusterGroupRef.current
    if (!group) return

    group.clearLayers()

    markers.forEach((marker) => {
      const m = createMarker(marker, handleClick, selectedMarkerId === marker.id)
      group.addLayer(m)
    })

    return () => {
      group.clearLayers()
    }
  }, [markers, handleClick, selectedMarkerId])

  return null
}
