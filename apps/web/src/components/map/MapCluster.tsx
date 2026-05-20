'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet/dist/leaflet.css'

import type { MarkerData } from '@/types/api'
import { useMapStore } from '@/stores/map.store'
import { getRiskColor } from '@/lib/utils'

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

function createMarker(
  marker: MarkerData,
  onClick: (marker: MarkerData) => void,
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

  const leafletMarker = L.marker([marker.lat, marker.lng], { icon })
  leafletMarker.on('click', () => onClick(marker))
  return leafletMarker
}

export interface MapClusterProps {
  markers: MarkerData[]
  maxClusterRadius?: number
  disableClusteringAtZoom?: number
  fitBoundsOnLoad?: boolean
  fitBoundsKey?: string
  onMarkerClick?: (marker: MarkerData) => void
}

export default function MapCluster({
  markers,
  maxClusterRadius = 50,
  disableClusteringAtZoom = 16,
  fitBoundsOnLoad = false,
  fitBoundsKey = 'initial',
  onMarkerClick,
}: MapClusterProps) {
  const map = useMap()
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)
  const lastFitBoundsKeyRef = useRef<string | null>(null)
  const selectMarker = useMapStore((s) => s.selectMarker)
  const selectedMarkerId = useMapStore((s) => s.selectedMarkerId)

  const handleClick = useCallback(
    (marker: MarkerData) => {
      selectMarker(marker.id)
      onMarkerClick?.(marker)
    },
    [onMarkerClick, selectMarker],
  )

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

  useEffect(() => {
    const group = clusterGroupRef.current
    if (!group) return

    group.clearLayers()

    markers.forEach((marker) => {
      const leafletMarker = createMarker(
        marker,
        handleClick,
        selectedMarkerId === marker.id,
      )
      group.addLayer(leafletMarker)
    })

    if (
      fitBoundsOnLoad &&
      markers.length > 0 &&
      lastFitBoundsKeyRef.current !== fitBoundsKey
    ) {
      map.fitBounds(group.getBounds(), { padding: [32, 32], maxZoom: 15 })
      lastFitBoundsKeyRef.current = fitBoundsKey
    }

    return () => {
      group.clearLayers()
    }
  }, [markers, handleClick, selectedMarkerId, fitBoundsOnLoad, fitBoundsKey, map])

  return null
}
