'use client'

import { useEffect, useState } from 'react'
import { Home, MapPin, Search, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import EmptyState from '@/components/shared/EmptyState'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useDebounce } from '@/hooks/useDebounce'

interface House {
  id: string
  houseNo?: string | null
  moo?: number | null
  address?: string | null
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL'
  lat?: number | null
  lng?: number | null
  village?: {
    name?: string | null
    code?: string | null
    moo?: number | null
  } | null
  _count?: {
    patients: number
  }
}

interface HousesResponse {
  success: boolean
  data?: House[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  error?: {
    message: string
  }
}

const riskLabels: Record<House['riskLevel'], string> = {
  CRITICAL: 'วิกฤติ',
  HIGH: 'สูง',
  MEDIUM: 'ปานกลาง',
  NORMAL: 'ปกติ',
}

const riskVariants: Record<House['riskLevel'], 'default' | 'destructive' | 'secondary' | 'outline'> = {
  CRITICAL: 'destructive',
  HIGH: 'default',
  MEDIUM: 'secondary',
  NORMAL: 'outline',
}

function formatCoordinate(value: number) {
  return value.toFixed(6)
}

export default function HouseholdsPage() {
  const [searchValue, setSearchValue] = useState('')
  const [page, setPage] = useState(1)
  const [houses, setHouses] = useState<House[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debouncedSearch = useDebounce(searchValue, 400)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    const controller = new AbortController()

    async function loadHouses() {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      })
      if (debouncedSearch) params.set('search', debouncedSearch)

      try {
        const response = await fetch(`/api/v1/houses?${params.toString()}`, {
          signal: controller.signal,
        })
        const payload = (await response.json()) as HousesResponse

        if (!response.ok || !payload.success) {
          throw new Error(payload.error?.message || 'Failed to fetch houses')
        }

        setHouses(payload.data || [])
        setTotal(payload.pagination?.total || 0)
        setTotalPages(payload.pagination?.totalPages || 1)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to fetch houses')
        setHouses([])
      } finally {
        setIsLoading(false)
      }
    }

    loadHouses()

    return () => controller.abort()
  }, [debouncedSearch, page])

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">ครัวเรือน</h1>
          <p className="text-sm text-muted-foreground">
            ค้นหาและตรวจสอบข้อมูลบ้าน ประชากร ระดับความเสี่ยง และพิกัดในพื้นที่
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหาบ้านเลขที่, ที่อยู่, หมู่บ้าน..."
              className="pl-9"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner text="กำลังโหลดข้อมูล..." />
            </div>
          ) : error ? (
            <EmptyState message="โหลดข้อมูลไม่สำเร็จ" description={error} />
          ) : houses.length === 0 ? (
            <EmptyState
              message="ไม่พบข้อมูลครัวเรือน"
              description="ลองค้นหาด้วยเงื่อนไขอื่น หรือซิงค์ข้อมูลจาก JHCIS"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>บ้านเลขที่</TableHead>
                    <TableHead>หมู่บ้าน</TableHead>
                    <TableHead>ที่อยู่</TableHead>
                    <TableHead>ประชากร</TableHead>
                    <TableHead>ความเสี่ยง</TableHead>
                    <TableHead>พิกัด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {houses.map((house) => (
                    <TableRow key={house.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          {house.houseNo || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{house.village?.name || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {house.village?.moo ? `หมู่ ${house.village.moo}` : house.village?.code || ''}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        {house.address || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {house._count?.patients ?? 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={riskVariants[house.riskLevel] || 'outline'}>
                          {riskLabels[house.riskLevel] || house.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {house.lat != null && house.lng != null ? (
                          <div className="space-y-1">
                            <div className="font-mono text-xs leading-5">
                              <div>Lat: {formatCoordinate(house.lat)}</div>
                              <div>Lng: {formatCoordinate(house.lng)}</div>
                            </div>
                            <a
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              href={`https://www.google.com/maps?q=${house.lat},${house.lng}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              เปิดแผนที่
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  แสดง {houses.length} จาก {total} รายการ
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    ก่อนหน้า
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
