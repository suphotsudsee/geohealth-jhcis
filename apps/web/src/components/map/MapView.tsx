'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { MapConfig } from '@/types/map'
import { useMapStore } from '@/stores/map.store'
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '@/lib/constants'

// ── Fix Leaflet default icon (the famous broken icon bug) ──
import 'leaflet/dist/images/marker-icon.png'
import 'leaflet/dist/images/marker-icon-2x.png'
import 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: '/icons/marker-icon.png',
  iconRetinaUrl: '/icons/marker-icon-2x.png',
  shadowUrl: '/icons/marker-shadow.png',
})

// ── Default config ──
const DEFAULT_CONFIG: MapConfig = {
  center: MAP_DEFAULT_CENTER,
  zoom: MAP_DEFAULT_ZOOM,
  minZoom: 6,
  maxZoom: 18,
}

// ── Internal: Map event handler (syncs store) ──
function MapEventHandler() {
  const setCenter = useMapStore((s) => s.setCenter)
  const setZoom = useMapStore((s) => s.setZoom)

  useMapEvents({
    moveend() {
      const map = this as L.Map
      const c = map.getCenter()
      setCenter([c.lat, c.lng])
      setZoom(map.getZoom())
    },
  })

  return null
}

// ── Internal: FullScreen toggle button ──
function FullScreenControl() {
  const map = useMap()

  const toggleFullscreen = useCallback(() => {
    const el = map.getContainer()
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }, [map])

  const FullScreenBtn = L.Control.extend({
    onAdd() {
      const btn = L.DomUtil.create('button', 'leaflet-control-zoom leaflet-bar')
      btn.innerHTML = '⛶'
      btn.title = 'เต็มจอ'
      btn.style.cssText =
        'width:34px;height:34px;line-height:34px;text-align:center;font-size:18px;cursor:pointer;background:white;border:none;border-radius:4px;'
      btn.onclick = toggleFullscreen
      return btn
    },
  })

  useEffect(() => {
    const control = new FullScreenBtn({ position: 'topleft' })
    map.addControl(control)
    return () => {
      map.removeControl(control)
    }
  }, [map])

  return null
}

// ── Internal: GPS Locate button ──
function GpsLocateControl() {
  const map = useMap()
  const markerRef = useRef<L.Marker | null>(null)

  const locate = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        map.setView([latitude, longitude], 16, { animate: true })

        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude])
        } else {
          markerRef.current = L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,0.3);"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
            zIndexOffset: 1000,
          }).addTo(map)
        }

        // Auto-remove marker after 10s
        setTimeout(() => {
          if (markerRef.current) {
            map.removeLayer(markerRef.current)
            markerRef.current = null
          }
        }, 10000)
      },
      () => {
        // Fallback: show a toast or silent fail
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [map])

  const GpsBtn = L.Control.extend({
    onAdd() {
      const btn = L.DomUtil.create('button', 'leaflet-control-zoom leaflet-bar')
      btn.innerHTML = '◎'
      btn.title = 'ตำแหน่งของฉัน'
      btn.style.cssText =
        'width:34px;height:34px;line-height:34px;text-align:center;font-size:16px;cursor:pointer;background:white;border:none;border-radius:4px;'
      btn.onclick = locate
      return btn
    },
  })

  useEffect(() => {
    const control = new GpsBtn({ position: 'topleft' })
    map.addControl(control)
    return () => {
      map.removeControl(control)
    }
  }, [map])

  return null
}

// ── Props ──
export interface MapViewProps {
  config?: Partial<MapConfig>
  scrollWheelZoom?: boolean
  satelliteAvailable?: boolean
  children?: React.ReactNode
  className?: string
}

// ── Main MapView ──
export default function MapView({
  config,
  scrollWheelZoom = true,
  satelliteAvailable = false,
  children,
  className,
}: MapViewProps) {
  const mergedConfig: MapConfig = { ...DEFAULT_CONFIG, ...config }

  return (
    <div className={`relative h-full w-full overflow-hidden ${className ?? ''}`}>
      <MapContainer
        center={mergedConfig.center}
        zoom={mergedConfig.zoom}
        minZoom={mergedConfig.minZoom}
        maxZoom={mergedConfig.maxZoom}
        zoomControl={false}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full"
        style={{ background: '#f0f0f0' }}
      >
        {/* Base tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Satellite layer (invisible by default, available via LayerControl) */}
        {satelliteAvailable && (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={20}
          />
        )}

        {/* Internal controls */}
        <MapEventHandler />
        <FullScreenControl />
        <GpsLocateControl />

        {/* Children: MarkerCluster, HeatmapLayer, VillageBoundary, etc. */}
        {children}
      </MapContainer>
    </div>
  )
}
