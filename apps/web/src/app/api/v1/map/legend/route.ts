import { NextResponse } from 'next/server'
import { DISEASE_COLORS } from '@/lib/constants'

export const runtime = 'nodejs'

export async function GET() {
  const legend = {
    riskLevels: [
      { label: 'Critical', color: '#ef4444', level: 'CRITICAL' },
      { label: 'High', color: '#f97316', level: 'HIGH' },
      { label: 'Medium', color: '#eab308', level: 'MEDIUM' },
      { label: 'Normal', color: '#22c55e', level: 'NORMAL' },
    ],
    diseases: Object.entries(DISEASE_COLORS).map(([code, color]) => ({
      code,
      color,
    })),
    markerTypes: [
      { type: 'patient', icon: 'person', description: 'ผู้ป่วย' },
      { type: 'house', icon: 'home', description: 'บ้าน' },
    ],
    icons: {
      patientMarker: {
        type: 'circle',
        sizes: { critical: 12, high: 10, medium: 8, normal: 6 },
      },
      clusterMarker: {
        type: 'circle',
        defaultSize: 16,
        color: '#6366f1',
      },
    },
  }

  return NextResponse.json({ success: true, data: legend })
}
