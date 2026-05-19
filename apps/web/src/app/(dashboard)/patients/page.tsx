'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import { useDebounce } from '@/hooks/useDebounce'
import { Search, Plus, ArrowUpDown } from 'lucide-react'

interface Patient {
  id: string
  cid?: string | null
  hn?: string | null
  fullName: string
  age?: number | null
  gender?: string | null
  riskLevel?: string | null
  village?: string | null
}

// Mock data for demonstration - replace with actual query
const MOCK_PATIENTS: Patient[] = []

export default function PatientsPage() {
  const [searchValue, setSearchValue] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(searchValue, 400)
  const isLoading = false
  const patients: Patient[] = MOCK_PATIENTS

  const getRiskBadge = (risk?: string | null) => {
    if (!risk) return null
    const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      CRITICAL: 'destructive',
      HIGH: 'default',
      MEDIUM: 'secondary',
      NORMAL: 'outline',
    }
    const labels: Record<string, string> = {
      CRITICAL: 'วิกฤติ',
      HIGH: 'สูง',
      MEDIUM: 'ปานกลาง',
      NORMAL: 'ปกติ',
    }
    return (
      <Badge variant={variants[risk] || 'outline'}>
        {labels[risk] || risk}
      </Badge>
    )
  }

  const getGenderLabel = (gender?: string | null) => {
    if (!gender) return '-'
    const labels: Record<string, string> = {
      MALE: 'ชาย',
      FEMALE: 'หญิง',
      UNKNOWN: 'ไม่ระบุ',
    }
    return labels[gender] || gender
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">ผู้ป่วย</h1>
          <p className="text-sm text-muted-foreground">
            ค้นหาและจัดการข้อมูลผู้ป่วยในพื้นที่
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มผู้ป่วย
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหา CID, HN, ชื่อ..."
                className="pl-9"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner text="กำลังโหลดข้อมูล..." />
            </div>
          ) : patients.length === 0 ? (
            <EmptyState
              message="ไม่พบข้อมูลผู้ป่วย"
              description="ลองค้นหาด้วยเงื่อนไขอื่น หรือเพิ่มผู้ป่วยใหม่"
              actionLabel="เพิ่มผู้ป่วย"
              onAction={() => {}}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">CID</TableHead>
                    <TableHead>HN</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        ชื่อ-นามสกุล
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>อายุ</TableHead>
                    <TableHead>เพศ</TableHead>
                    <TableHead>ระดับความเสี่ยง</TableHead>
                    <TableHead>หมู่บ้าน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-mono text-xs">
                        {patient.cid || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {patient.hn || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {patient.fullName}
                      </TableCell>
                      <TableCell>{patient.age ?? '-'}</TableCell>
                      <TableCell>{getGenderLabel(patient.gender)}</TableCell>
                      <TableCell>{getRiskBadge(patient.riskLevel)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {patient.village || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  แสดง 0 จาก 0 รายการ
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ก่อนหน้า
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    onClick={() => setPage((p) => p + 1)}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
