import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OfflineVisit {
  offlineId: string
  patientId: string
  houseId?: string
  visitDate: string
  checkInLat?: number
  checkInLng?: number
  visitType: string
  notes?: string
  photos: string[]
  voiceNote?: string
  checklist: Record<string, unknown>
  createdAt: string
}

interface VisitSchedule {
  id: string
  patientId: string
  patientName: string
  visitDate: string
  visitType: string
  status: string
}

interface FFCState {
  pendingVisits: OfflineVisit[]
  cachedSchedule: VisitSchedule[]
  isOnline: boolean
  addPendingVisit: (visit: OfflineVisit) => void
  removeSynced: (offlineId: string) => void
  setOnline: (online: boolean) => void
  syncAll: () => OfflineVisit[]
  setCachedSchedule: (schedule: VisitSchedule[]) => void
}

export const useFFCStore = create<FFCState>()(
  persist(
    (set, get) => ({
      pendingVisits: [],
      cachedSchedule: [],
      isOnline: true,

      addPendingVisit: (visit) =>
        set((state) => ({
          pendingVisits: [...state.pendingVisits, visit],
        })),

      removeSynced: (offlineId) =>
        set((state) => ({
          pendingVisits: state.pendingVisits.filter(
            (v) => v.offlineId !== offlineId
          ),
        })),

      setOnline: (online) => set({ isOnline: online }),

      syncAll: () => {
        return get().pendingVisits
      },

      setCachedSchedule: (schedule) => set({ cachedSchedule: schedule }),
    }),
    {
      name: 'geohealth-ffc',
      partialize: (state) => ({
        pendingVisits: state.pendingVisits,
        cachedSchedule: state.cachedSchedule,
      }),
    }
  )
)
