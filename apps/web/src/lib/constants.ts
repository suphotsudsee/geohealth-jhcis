export const ROLES = ['ADMIN', 'DISTRICT', 'HOSPITAL', 'FFC', 'VIEWER'] as const
export const VISIT_TYPES = ['ROUTINE', 'FOLLOW_UP', 'EMERGENCY', 'ASSESSMENT', 'OTHER'] as const
export const VISIT_STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'MISSED'] as const
export const RISK_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'NORMAL'] as const
export const GENDERS = ['MALE', 'FEMALE', 'UNKNOWN'] as const

export const DISEASE_COLORS: Record<string, string> = {
  DM: '#ef4444', HT: '#f97316', TB: '#a855f7',
  DENGUE: '#eab308', COVID: '#3b82f6', STROKE: '#ec4899',
  CANCER: '#8b5cf6', COPD: '#14b8a6', CKD: '#06b6d4',
}

export const MAP_DEFAULT_CENTER: [number, number] = [15.0, 102.0]
export const MAP_DEFAULT_ZOOM = 10
export const MAX_SEARCH_RESULTS = 50

export const PAGINATION_DEFAULTS = { page: 1, limit: 50 }

export const SYNC_INTERVALS = [
  { label: 'ทุก 1 ชั่วโมง', value: '0 * * * *' },
  { label: 'ทุก 6 ชั่วโมง', value: '0 */6 * * *' },
  { label: 'ทุก 12 ชั่วโมง', value: '0 */12 * * *' },
  { label: 'ทุกวันเที่ยงคืน', value: '0 0 * * *' },
]
