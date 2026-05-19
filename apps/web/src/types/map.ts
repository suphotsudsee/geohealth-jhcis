import type { LatLngExpression } from 'leaflet'

export interface MapConfig {
  center: LatLngExpression
  zoom: number
  minZoom: number
  maxZoom: number
  maxBounds?: LatLngExpression[]
}

export interface MapLayer {
  id: string
  name: string
  type: 'heatmap' | 'marker' | 'polygon' | 'cluster'
  visible: boolean
  opacity: number
}

export interface LayerControlProps {
  layers: MapLayer[]
  onToggle: (layerId: string) => void
  onChangeOpacity: (layerId: string, opacity: number) => void
}

export interface MapLegendItem {
  label: string
  color: string
  type: 'circle' | 'square' | 'line'
}
