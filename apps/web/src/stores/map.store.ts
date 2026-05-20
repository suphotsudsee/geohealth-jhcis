import { create } from 'zustand'

interface MapState {
  center: [number, number]
  zoom: number
  activeLayers: string[]
  selectedMarkerId: string | null
  setCenter: (center: [number, number]) => void
  setZoom: (zoom: number) => void
  toggleLayer: (layer: string) => void
  setLayerActive: (layer: string, active: boolean) => void
  selectMarker: (id: string | null) => void
}

export const useMapStore = create<MapState>((set) => ({
  center: [15.0, 102.0],
  zoom: 10,
  activeLayers: ['markers', 'villages'],
  selectedMarkerId: null,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: state.activeLayers.includes(layer)
        ? state.activeLayers.filter((l) => l !== layer)
        : [...state.activeLayers, layer],
    })),
  setLayerActive: (layer, active) =>
    set((state) => ({
      activeLayers: active
        ? state.activeLayers.includes(layer)
          ? state.activeLayers
          : [...state.activeLayers, layer]
        : state.activeLayers.filter((l) => l !== layer),
    })),
  selectMarker: (id) => set({ selectedMarkerId: id }),
}))
