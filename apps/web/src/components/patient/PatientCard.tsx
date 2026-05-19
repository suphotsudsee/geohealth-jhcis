'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getRiskColor } from '@/lib/utils'
import { User, Hash, Calendar, MapPin, AlertTriangle } from 'lucide-react'

interface PatientCardPatient {
  id: string
  fullName: string
  cid?: string | null
  age?: number | null
  gender?: string | null
  riskLevel: string
  address?: string | null
  house?: { houseNo?: string | null; village?: { name?: string | null } | null } | null
}

interface PatientCardProps {
  patient: PatientCardPatient
}

const riskLabels: Record<string, string> = {
  CRITICAL: 'วิกฤต',
  HIGH: 'สูง',
  MEDIUM: 'ปานกลาง',
  NORMAL: 'ปกติ',
}

const genderLabels: Record<string, string> = {
  MALE: 'ชาย',
  FEMALE: 'หญิง',
  UNKNOWN: 'ไม่ระบุ',
}

export default function PatientCard({ patient }: PatientCardProps) {
  const riskColor = getRiskColor(patient.riskLevel)
  const riskLabel = riskLabels[patient.riskLevel] || patient.riskLevel

  return (
    <Link href={`/patients/${patient.id}`}>
      <Card className="cursor-pointer transition-colors hover:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{patient.fullName}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {patient.cid && (
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {patient.cid}
                  </span>
                )}
                {patient.age !== null && patient.age !== undefined && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {patient.age} ปี
                  </span>
                )}
                {patient.gender && (
                  <span>{genderLabels[patient.gender] || patient.gender}</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {patient.house?.houseNo && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    บ้าน {patient.house.houseNo}
                  </span>
                )}
                {patient.house?.village?.name && (
                  <span>หมู่ {patient.house.village.name}</span>
                )}
                {patient.address && (
                  <span className="truncate">{patient.address}</span>
                )}
              </div>
            </div>

            {patient.riskLevel !== 'NORMAL' && (
              <Badge
                className="shrink-0 text-[10px]"
                variant="outline"
                style={{
                  borderColor: riskColor,
                  color: riskColor,
                }}
              >
                <AlertTriangle className="mr-1 h-3 w-3" style={{ color: riskColor }} />
                {riskLabel}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
