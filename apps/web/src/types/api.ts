import type { Role, RiskLevel, Gender, VisitType, VisitStatus } from '@prisma/client'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  pagination?: Pagination
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: UserResponse
}

export interface UserResponse {
  id: string
  username: string
  displayName: string
  role: Role
  email?: string | null
  phone?: string | null
  villageCode?: string | null
  districtCode?: string | null
  provinceCode?: string | null
}

export interface PatientSummary {
  id: string
  cid?: string | null
  hn?: string | null
  fullName: string
  age?: number | null
  gender?: Gender | null
  riskLevel: RiskLevel
  lat?: number | null
  lng?: number | null
  house?: { houseNo?: string | null; village?: { name?: string | null } } | null
}

export interface MarkerData {
  id: string
  lat: number
  lng: number
  type: 'house' | 'patient'
  riskLevel: RiskLevel
  label?: string
  popupData?: Record<string, unknown>
}

export interface HeatmapPoint {
  lat: number
  lng: number
  intensity: number
}

export interface ClusterData {
  lat: number
  lng: number
  count: number
  disease?: string
}

export interface VillageBoundary {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: Record<string, unknown>
    geometry: { type: string; coordinates: unknown }
  }>
}

export interface FFCVisitRequest {
  patientId: string
  houseId?: string
  visitDate: string
  checkInLat?: number
  checkInLng?: number
  visitType: VisitType
  notes?: string
  photos?: string[]
  voiceNote?: string
  checklist?: Record<string, unknown>
  nextVisitDate?: string
}

export interface DashboardStats {
  totalPopulation: number
  totalChronic: number
  totalBedridden: number
  totalRisk: number
  ffcToday: number
  ffcThisMonth: number
}
