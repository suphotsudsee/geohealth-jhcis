'use client'

import { useEffect, useState } from 'react'

interface FacilityInfo {
  pcucode: string | null
  name: string
  subDistrictName: string | null
  districtName: string | null
  provinceName: string | null
}

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
}

const fallbackFacility: FacilityInfo = {
  pcucode: null,
  name: 'GeoHealth',
  subDistrictName: null,
  districtName: null,
  provinceName: null,
}

export function useFacilityInfo() {
  const [facility, setFacility] = useState<FacilityInfo>(fallbackFacility)

  useEffect(() => {
    let active = true

    async function loadFacility() {
      try {
        const response = await fetch('/api/v1/facility')
        if (!response.ok) return

        const payload = (await response.json()) as ApiResponse<FacilityInfo>
        if (active && payload.success && payload.data?.name) {
          setFacility(payload.data)
        }
      } catch {
        // Keep the fallback title when JHCIS is unavailable.
      }
    }

    loadFacility()

    return () => {
      active = false
    }
  }, [])

  return facility
}
