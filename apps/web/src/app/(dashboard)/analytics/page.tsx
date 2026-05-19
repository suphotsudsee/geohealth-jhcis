'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DISEASE_COLORS, MAP_DEFAULT_CENTER } from '@/lib/constants'
import { MapPin, BarChart3, Activity, Users, ArrowUpDown, Search, Filter } from 'lucide-react'

const DISEASE_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'DM', label: 'DM — เบาหวาน' },
  { value: 'HT', label: 'HT — ความดันโลหิตสูง' },
  { value: 'TB', label: 'TB — วัณโรค' },
  { value: 'DENGUE', label: 'DENGUE — ไข้เลือดออก' },
  { value: 'COVID', label: 'COVID — โควิด-19' },
  { value: 'STROKE', label: 'STROKE — หลอดเลือดสมอง' },
]

const VILLAGE_OPTIONS = [
  { value: '', label: 'ทุกหมู่บ้าน' },
  { value: 'v1', label: 'หมู่ 1' },
  { value: 'v2', label: 'หมู่ 2' },
  { value: 'v3', label: 'หมู่ 3' },
]

interface DiseaseStat {
  name: string
  count: number
  male: number
  female: number
  avgAge: number
}

interface VillageStat {
  name: string
  totalPopulation: number
  chronic: number
  risk: number
  bedridden: number
  ffcCoverage: number
}

const MOCK_DISEASE_DATA: DiseaseStat[] = [
  { name: 'DM', count: 4520, male: 1800, female: 2720, avgAge: 62 },
  { name: 'HT', count: 3890, male: 1600, female: 2290, avgAge: 58 },
  { name: 'TB', count: 230, male: 140, female: 90, avgAge: 45 },
  { name: 'DENGUE', count: 45, male: 25, female: 20, avgAge: 28 },
  { name: 'COVID', count: 120, male: 55, female: 65, avgAge: 38 },
  { name: 'STROKE', count: 340, male: 180, female: 160, avgAge: 67 },
]

const MOCK_VILLAGE_DATA: VillageStat[] = [
  { name: 'หมู่ 1', totalPopulation: 1520, chronic: 340, risk: 85, bedridden: 12, ffcCoverage: 78 },
  { name: 'หมู่ 2', totalPopulation: 1230, chronic: 280, risk: 62, bedridden: 8, ffcCoverage: 82 },
  { name: 'หมู่ 3', totalPopulation: 980, chronic: 210, risk: 45, bedridden: 5, ffcCoverage: 91 },
  { name: 'หมู่ 4', totalPopulation: 1850, chronic: 420, risk: 110, bedridden: 15, ffcCoverage: 74 },
  { name: 'หมู่ 5', totalPopulation: 760, chronic: 180, risk: 38, bedridden: 3, ffcCoverage: 88 },
  { name: 'หมู่ 6', totalPopulation: 1100, chronic: 250, risk: 55, bedridden: 7, ffcCoverage: 85 },
  { name: 'หมู่ 7', totalPopulation: 620, chronic: 140, risk: 30, bedridden: 4, ffcCoverage: 92 },
]

const MOCK_HEATMAP_DATA = Array.from({ length: 30 }, (_, i) => ({
  id: `hm-${i}`,
  lat: MAP_DEFAULT_CENTER[0] + (Math.random() - 0.5) * 0.05,
  lng: MAP_DEFAULT_CENTER[1] + (Math.random() - 0.5) * 0.05,
  intensity: Math.floor(Math.random() * 100),
}))

export default function AnalyticsPage() {
  const [selectedDisease, setSelectedDisease] = useState('')
  const [selectedVillage, setSelectedVillage] = useState('')
  const [dateRange, setDateRange] = useState('all')

  const { data: diseaseStats, isLoading } = useQuery({
    queryKey: ['analytics-disease', selectedDisease],
    queryFn: async () => MOCK_DISEASE_DATA,
  })

  const filteredDiseaseData = useMemo(() => {
    if (!diseaseStats) return []
    if (!selectedDisease) return diseaseStats
    return diseaseStats.filter((d) => d.name === selectedDisease)
  }, [diseaseStats, selectedDisease])

  const filteredVillageData = useMemo(() => {
    if (!selectedVillage) return MOCK_VILLAGE_DATA
    return MOCK_VILLAGE_DATA.filter((v) => v.name === selectedVillage)
  }, [selectedVillage])

  const totalChronic = useMemo(
    () => filteredDiseaseData.reduce((sum, d) => sum + d.count, 0),
    [filteredDiseaseData]
  )

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">วิเคราะห์ข้อมูล</h1>
        <p className="text-sm text-muted-foreground">
          แดชบอร์ดวิเคราะห์ข้อมูลสุขภาพเชิงลึก
        </p>
      </div>

      {/* Filter Panel */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">โรค</label>
              <Select value={selectedDisease} onValueChange={setSelectedDisease}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="เลือกโรค" />
                </SelectTrigger>
                <SelectContent>
                  {DISEASE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">หมู่บ้าน</label>
              <Select value={selectedVillage} onValueChange={setSelectedVillage}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="เลือกหมู่บ้าน" />
                </SelectTrigger>
                <SelectContent>
                  {VILLAGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ช่วงเวลา</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="เลือกช่วงเวลา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="3m">3 เดือนล่าสุด</SelectItem>
                  <SelectItem value="6m">6 เดือนล่าสุด</SelectItem>
                  <SelectItem value="1y">1 ปีล่าสุด</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              setSelectedDisease('')
              setSelectedVillage('')
              setDateRange('all')
            }}>
              <Filter className="mr-2 h-4 w-4" />
              ล้างตัวกรอง
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ผู้ป่วยทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalChronic.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">หมู่บ้าน</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filteredVillageData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">กลุ่มเสี่ยง</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filteredVillageData.reduce((s, v) => s + v.risk, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">FFC Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {filteredVillageData.length > 0
                ? Math.round(filteredVillageData.reduce((s, v) => s + v.ffcCoverage, 0) / filteredVillageData.length)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Disease Stats Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              สถิติโรค{selectedDisease ? ` — ${DISEASE_OPTIONS.find(o => o.value === selectedDisease)?.label || selectedDisease}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <div className="h-72">
                <div className="flex h-full items-end gap-3">
                  {filteredDiseaseData.map((d) => {
                    const maxCount = Math.max(...filteredDiseaseData.map((x) => x.count))
                    const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0
                    return (
                      <div key={d.name} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                        <span className="text-xs font-medium">{d.count.toLocaleString()}</span>
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: DISEASE_COLORS[d.name] || '#6b7280',
                            minHeight: d.count > 0 ? '8px' : '0px',
                          }}
                        />
                        <span className="text-xs text-muted-foreground">{d.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cluster Info Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              ข้อมูลคลัสเตอร์
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">คลัสเตอร์โรคที่พบ</p>
              {['DM', 'HT', 'STROKE', 'DENGUE', 'TB'].slice(0, selectedDisease ? 1 : 5).map((disease) => {
                const stat = MOCK_DISEASE_DATA.find((d) => d.name === disease)
                if (!stat || (selectedDisease && disease !== selectedDisease)) return null
                return (
                  <div key={disease} className="flex items-center justify-between rounded-lg border p-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: DISEASE_COLORS[disease] || '#6b7280' }}
                      />
                      <span className="text-sm">{disease}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold">{stat.count.toLocaleString()}</span>
                      <p className="text-[10px] text-muted-foreground">
                        ชาย {stat.male} / หญิง {stat.female}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">อายุเฉลี่ย</p>
              <p className="text-lg font-bold">
                {filteredDiseaseData.length > 0
                  ? Math.round(filteredDiseaseData.reduce((s, d) => s + d.avgAge, 0) / filteredDiseaseData.length)
                  : '-'} ปี
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            แผนที่ความร้อน (Heatmap)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg border bg-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">แผนที่ความร้อน</p>
                <p className="text-xs text-muted-foreground">
                  {MOCK_HEATMAP_DATA.length} จุดข้อมูล
                </p>
              </div>
            </div>
            {/* Simulated heatmap dots */}
            <div className="absolute inset-0">
              {MOCK_HEATMAP_DATA.slice(0, 50).map((point) => (
                <div
                  key={point.id}
                  className="absolute h-3 w-3 rounded-full opacity-60"
                  style={{
                    left: `${((point.lng - MAP_DEFAULT_CENTER[1] + 0.025) / 0.05) * 100}%`,
                    top: `${((MAP_DEFAULT_CENTER[0] + 0.025 - point.lat) / 0.05) * 100}%`,
                    backgroundColor: point.intensity > 70 ? '#ef4444' : point.intensity > 40 ? '#f97316' : '#eab308',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Village Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            เปรียบเทียบข้อมูลรายหมู่บ้าน
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>หมู่บ้าน</TableHead>
                <TableHead className="text-right">ประชากร</TableHead>
                <TableHead className="text-right">โรคเรื้อรัง</TableHead>
                <TableHead className="text-right">กลุ่มเสี่ยง</TableHead>
                <TableHead className="text-right">ติดเตียง</TableHead>
                <TableHead className="text-right">FFC Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVillageData.map((v) => (
                <TableRow key={v.name}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="text-right">{v.totalPopulation.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{v.chronic.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{v.risk.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{v.bedridden}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={v.ffcCoverage >= 80 ? 'default' : v.ffcCoverage >= 60 ? 'secondary' : 'outline'}>
                      {v.ffcCoverage}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
