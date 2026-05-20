'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { FileText, FileSpreadsheet, FileDown, Map, Download, Clock, CheckCircle2, XCircle, AlertCircle, Activity, Users, Home, BarChart3 } from 'lucide-react'

interface ReportType {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  formats: string[]
}

interface ExportHistory {
  id: string
  type: string
  format: string
  status: 'success' | 'failed'
  createdAt: string
  fileName: string
}

interface VillageOption {
  id: string
  name: string | null
  moo: number | null
}

interface DiseaseOption {
  name: string
  label: string
  count: number
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'patient-list',
    title: 'รายชื่อผู้ป่วย',
    description: 'รายชื่อผู้ป่วยทั้งหมดในระบบ พร้อมข้อมูลพื้นฐาน CID, HN, อายุ, เพศ, ระดับความเสี่ยง',
    icon: <Users className="h-8 w-8" />,
    formats: ['pdf', 'excel', 'csv', 'geojson'],
  },
  {
    id: 'chronic-summary',
    title: 'สรุปโรคเรื้อรัง',
    description: 'สรุปจำนวนผู้ป่วยโรคเรื้อรังแยกตามประเภทโรค เพศ และช่วงอายุ',
    icon: <Activity className="h-8 w-8" />,
    formats: ['pdf', 'excel', 'csv'],
  },
  {
    id: 'ffc-report',
    title: 'รายงาน FFC',
    description: 'รายงานการเยี่ยมบ้านของทีม FFC จำนวนครั้ง ความครอบคลุม สถานะการติดตาม',
    icon: <Home className="h-8 w-8" />,
    formats: ['pdf', 'excel', 'csv', 'geojson'],
  },
  {
    id: 'village-report',
    title: 'รายงานหมู่บ้าน',
    description: 'ข้อมูลจำแนกรายหมู่บ้าน ประชากร โรคเรื้อรัง กลุ่มเสี่ยง ผู้ติดเตียง',
    icon: <BarChart3 className="h-8 w-8" />,
    formats: ['pdf', 'excel', 'csv'],
  },
]

const FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV',
  geojson: 'GeoJSON',
  shapefile: 'Shapefile',
}

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4" />,
  excel: <FileSpreadsheet className="h-4 w-4" />,
  csv: <FileDown className="h-4 w-4" />,
  geojson: <Map className="h-4 w-4" />,
}

async function downloadReport(type: string, format: string, filters: Record<string, unknown>) {
  const endpoint = format === 'pdf' ? '/api/v1/reports/pdf' : '/api/v1/reports/export'
  const body = { type, format, filters }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Download failed')
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="?(.+?)"?$/)
  const fileName = match?.[1] || `${type}-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : format}`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return fileName
}

export default function ReportsPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [selectedVillage, setSelectedVillage] = useState('all')
  const [selectedDisease, setSelectedDisease] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [villages, setVillages] = useState<VillageOption[]>([])
  const [diseases, setDiseases] = useState<DiseaseOption[]>([])
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([])

  useEffect(() => {
    fetch('/api/v1/villages')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setVillages(json.data)
      })
      .catch(console.error)

    fetch('/api/v1/analytics/diseases')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setDiseases(json.data)
      })
      .catch(console.error)
  }, [])

  const handleDownload = async (type: string, format: string) => {
    const downloadId = `${type}-${format}`
    setDownloadingId(downloadId)
    try {
      const fileName = await downloadReport(type, format, {
        villageId: selectedVillage !== 'all' ? selectedVillage : undefined,
        chronicCode: selectedDisease !== 'all' ? selectedDisease : undefined,
        dateRange: dateRange !== 'all' ? dateRange : undefined,
      })
      setExportHistory((current) => [
        {
          id: `${Date.now()}`,
          type,
          format,
          status: 'success' as const,
          createdAt: new Date().toISOString(),
          fileName,
        },
        ...current,
      ].slice(0, 5))
      toast.success(`ดาวน์โหลด ${REPORT_TYPES.find((r) => r.id === type)?.title} (${FORMAT_LABELS[format] || format}) สำเร็จ`)
    } catch (error) {
      setExportHistory((current) => [
        {
          id: `${Date.now()}`,
          type,
          format,
          status: 'failed' as const,
          createdAt: new Date().toISOString(),
          fileName: `${type}-${new Date().toISOString().split('T')[0]}.${format}`,
        },
        ...current,
      ].slice(0, 5))
      toast.error('ดาวน์โหลดไม่สำเร็จ', {
        description: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด',
      })
    } finally {
      setDownloadingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">รายงาน</h1>
        <p className="text-sm text-muted-foreground">
          สร้างและดาวน์โหลดรายงานในรูปแบบต่างๆ
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">หมู่บ้าน</label>
              <Select value={selectedVillage} onValueChange={setSelectedVillage}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="ทุกหมู่บ้าน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกหมู่บ้าน</SelectItem>
                  {villages.map((village) => (
                    <SelectItem key={village.id} value={village.id}>
                      {village.moo ? `หมู่ ${village.moo} ` : ''}{village.name || village.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">โรค</label>
              <Select value={selectedDisease} onValueChange={setSelectedDisease}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="ทุกโรค" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกโรค</SelectItem>
                  {diseases.map((disease) => (
                    <SelectItem key={disease.name} value={disease.name}>
                      {disease.name} — {disease.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ช่วงเวลา</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="3m">3 เดือนล่าสุด</SelectItem>
                  <SelectItem value="6m">6 เดือนล่าสุด</SelectItem>
                  <SelectItem value="1y">1 ปีล่าสุด</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Type Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {REPORT_TYPES.map((report) => (
          <Card key={report.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  {report.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {report.formats.map((format) => {
                      const isDownloading = downloadingId === `${report.id}-${format}`
                      return (
                        <Button
                          key={format}
                          variant="outline"
                          size="sm"
                          disabled={isDownloading}
                          onClick={() => handleDownload(report.id, format)}
                        >
                          {isDownloading ? (
                            <Skeleton className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            FORMAT_ICONS[format] || <Download className="h-4 w-4 mr-1" />
                          )}
                          {FORMAT_LABELS[format] || format.toUpperCase()}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            ประวัติการส่งออก (ล่าสุด 5 รายการ)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exportHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">ไม่พบประวัติการส่งออก</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รายงาน</TableHead>
                  <TableHead>รูปแบบ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ไฟล์</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportHistory.map((item) => {
                  const reportType = REPORT_TYPES.find((r) => r.id === item.type)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{reportType?.title || item.type}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{FORMAT_LABELS[item.format] || item.format}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.status === 'success' ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            สำเร็จ
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="mr-1 h-3 w-3" />
                            ล้มเหลว
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.fileName}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
