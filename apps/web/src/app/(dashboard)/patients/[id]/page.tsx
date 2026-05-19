'use client'

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatAge, getRiskColor, cn } from '@/lib/utils'
import { ArrowLeft, MapPin, Phone, User, Calendar, Clock, FileText, Printer, Syringe, Stethoscope, FlaskConical, Home, AlertCircle, ChevronRight, CheckCircle2, XCircle, Video } from 'lucide-react'
import { DISEASE_COLORS } from '@/lib/constants'
import { toast } from 'sonner'

interface PatientProfile {
  id: string
  cid: string | null
  hn: string | null
  fullName: string
  firstName: string | null
  lastName: string | null
  birthDate: string | null
  age: number | null
  gender: string | null
  phone: string | null
  riskLevel: string
  chronicDisease: string | null
  drugAllergy: string | null
  disability: boolean | null
  bedridden: boolean | null
  imageUrl: string | null
  lat: number | null
  lng: number | null
  house: {
    id: string
    houseNo: string | null
    moo: number | null
    address: string | null
    lat: number | null
    lng: number | null
    village: { id: string; name: string; code: string; moo: number | null } | null
  } | null
  chronicRecords: Array<{
    id: string
    diseaseCode: string
    diseaseName: string
    diagnosedDate: string | null
    severity: string | null
    isActive: boolean
    lastFollowUp: string | null
    hospitalCode: string | null
  }>
  recentVisits: Array<{
    id: string
    visitDate: string
    diagnosisName: string | null
    hospitalCode: string | null
    visitType: string | null
  }>
  recentLabs: Array<{
    id: string
    labDate: string
    labName: string
    result: string
    unit: string | null
    normalRange: string | null
    abnormal: boolean
  }>
  currentDrugs: Array<{
    id: string
    drugName: string
    dosage: string | null
    frequency: string | null
    startDate: string | null
    endDate: string | null
  }>
  recentFfcVisits: Array<{
    id: string
    visitDate: string
    visitType: string
    status: string
    notes: string | null
    checkInLat: number | null
    checkInLng: number | null
    nextVisitDate: string | null
    user: { id: string; displayName: string } | null
  }>
  lastSyncAt: string | null
  createdAt: string
  updatedAt: string
}

async function fetchPatientProfile(id: string): Promise<PatientProfile> {
  const res = await fetch(`/api/v1/patients/${id}/profile`)
  if (!res.ok) throw new Error('Failed to fetch patient profile')
  const json = await res.json()
  return json.data
}

const riskLabels: Record<string, string> = {
  CRITICAL: 'วิกฤติ',
  HIGH: 'สูง',
  MEDIUM: 'ปานกลาง',
  NORMAL: 'ปกติ',
}

const riskVariants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  CRITICAL: 'destructive',
  HIGH: 'default',
  MEDIUM: 'secondary',
  NORMAL: 'outline',
}

const genderLabels: Record<string, string> = {
  MALE: 'ชาย',
  FEMALE: 'หญิง',
  UNKNOWN: 'ไม่ระบุ',
}

const visitTypeLabels: Record<string, string> = {
  ROUTINE: 'ปกติ',
  FOLLOW_UP: 'ติดตามผล',
  EMERGENCY: 'ฉุกเฉิน',
  ASSESSMENT: 'ประเมิน',
  OTHER: 'อื่นๆ',
}

const visitStatusColors: Record<string, string> = {
  COMPLETED: 'text-green-600 bg-green-100 dark:bg-green-950',
  IN_PROGRESS: 'text-blue-600 bg-blue-100 dark:bg-blue-950',
  PLANNED: 'text-amber-600 bg-amber-100 dark:bg-amber-950',
  CANCELLED: 'text-gray-600 bg-gray-100 dark:bg-gray-950',
  MISSED: 'text-red-600 bg-red-100 dark:bg-red-950',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAgeGroup(age: number | null): string {
  if (age === null) return ''
  if (age < 15) return 'เด็ก'
  if (age < 60) return 'วัยทำงาน'
  return 'ผู้สูงอายุ'
}

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('info')

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', resolvedParams.id],
    queryFn: () => fetchPatientProfile(resolvedParams.id),
  })

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">ไม่พบข้อมูลผู้ป่วย</h2>
        <p className="text-sm text-muted-foreground">ผู้ป่วยที่คุณค้นหาไม่มีอยู่ในระบบ หรืออาจถูกลบไปแล้ว</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับ
          </Button>
          <Button onClick={() => router.push('/patients')}>
            ไปยังรายชื่อผู้ป่วย
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-16 w-16 border-2 border-border">
            {patient.imageUrl ? (
              <AvatarImage src={patient.imageUrl} alt={patient.fullName} />
            ) : null}
            <AvatarFallback className="text-lg">{getInitials(patient.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{patient.fullName}</h1>
              <Badge variant={riskVariants[patient.riskLevel] || 'outline'}>
                {riskLabels[patient.riskLevel] || patient.riskLevel}
              </Badge>
              {patient.bedridden && <Badge variant="secondary">ติดเตียง</Badge>}
              {patient.disability && <Badge variant="secondary">พิการ</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {patient.age !== null ? `${patient.age} ปี` : '-'} · {genderLabels[patient.gender || ''] || '-'} · {getAgeGroup(patient.age)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {patient.lat && patient.lng && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`https://www.google.com/maps?q=${patient.lat},${patient.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="mr-2 h-4 w-4" />
                ดูแผนที่
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => toast.info('กำลังดำเนินการ...')}>
            <Calendar className="mr-2 h-4 w-4" />
            นัด FFC
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            พิมพ์
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="info">ข้อมูลทั่วไป</TabsTrigger>
            <TabsTrigger value="medical">ข้อมูลทางการแพทย์</TabsTrigger>
            <TabsTrigger value="ffc">FFC</TabsTrigger>
            <TabsTrigger value="map">แผนที่</TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* Tab 1: ข้อมูลทั่วไป */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Personal Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  ข้อมูลส่วนตัว
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">CID</span>
                  <span className="text-sm font-mono font-medium">{patient.cid || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">HN</span>
                  <span className="text-sm font-mono font-medium">{patient.hn || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">วันเกิด</span>
                  <span className="text-sm font-medium">
                    {patient.birthDate ? formatDate(patient.birthDate) : '-'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">อายุ</span>
                  <span className="text-sm font-medium">{patient.age !== null ? `${patient.age} ปี` : '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">เพศ</span>
                  <span className="text-sm font-medium">{genderLabels[patient.gender || ''] || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">เบอร์โทร</span>
                  <span className="text-sm font-medium flex items-center gap-1">
                    {patient.phone ? (
                      <>
                        <Phone className="h-3 w-3" />
                        {patient.phone}
                      </>
                    ) : '-'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">โรคประจำตัว</span>
                  <span className="text-sm font-medium">{patient.chronicDisease || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">แพ้ยา</span>
                  <span className="text-sm font-medium">{patient.drugAllergy || '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Address & GPS Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Home className="h-4 w-4" />
                  ที่อยู่และพิกัด
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">บ้านเลขที่</span>
                  <span className="text-sm font-medium">{patient.house?.houseNo || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">หมู่ที่</span>
                  <span className="text-sm font-medium">
                    {patient.house?.village?.moo
                      ? `หมู่ ${patient.house.village.moo}`
                      : patient.house?.moo
                        ? `หมู่ ${patient.house.moo}`
                        : '-'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">หมู่บ้าน</span>
                  <span className="text-sm font-medium">{patient.house?.village?.name || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ที่อยู่</span>
                  <span className="text-sm font-medium text-right max-w-[200px]">
                    {patient.house?.address || '-'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ละติจูด</span>
                  <span className="text-sm font-mono font-medium">
                    {patient.lat?.toFixed(6) || patient.house?.lat?.toFixed(6) || '-'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ลองจิจูด</span>
                  <span className="text-sm font-mono font-medium">
                    {patient.lng?.toFixed(6) || patient.house?.lng?.toFixed(6) || '-'}
                  </span>
                </div>
                {(patient.lat || patient.house?.lat) && (patient.lng || patient.house?.lng) && (
                  <>
                    <Separator />
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link
                        href={`https://www.google.com/maps?q=${patient.lat || patient.house?.lat},${patient.lng || patient.house?.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        เปิดใน Google Maps
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">ข้อมูลด่วน</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">โรคเรื้อรังที่ active</span>
                  <span className="text-lg font-bold">{patient.chronicRecords.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ยาที่กำลังใช้</span>
                  <span className="text-lg font-bold">{patient.currentDrugs.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">เยี่ยมบ้านครั้งล่าสุด</span>
                  <span className="text-sm font-medium">
                    {patient.recentFfcVisits[0]
                      ? formatDate(patient.recentFfcVisits[0].visitDate)
                      : 'ไม่มีข้อมูล'}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ซิงค์ล่าสุด</span>
                  <span className="text-sm font-medium">
                    {patient.lastSyncAt ? formatDate(patient.lastSyncAt) : 'ไม่เคยซิงค์'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: ข้อมูลทางการแพทย์ */}
        <TabsContent value="medical" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Chronic Diseases */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Stethoscope className="h-4 w-4" />
                  โรคเรื้อรัง
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.chronicRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">ไม่มีข้อมูลโรคเรื้อรัง</p>
                ) : (
                  <div className="space-y-3">
                    {patient.chronicRecords.map((record) => (
                      <div key={record.id} className="flex items-start justify-between rounded-lg border p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: DISEASE_COLORS[record.diseaseCode] || '#6b7280' }}
                            />
                            <span className="font-medium text-sm">{record.diseaseName}</span>
                            <span className="text-xs text-muted-foreground">({record.diseaseCode})</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            วินิจฉัย: {record.diagnosedDate ? formatDate(record.diagnosedDate) : '-'}
                            {record.severity ? ` · ระดับ: ${record.severity}` : ''}
                          </p>
                        </div>
                        <Badge variant={record.isActive ? 'default' : 'secondary'} className="shrink-0">
                          {record.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Syringe className="h-4 w-4" />
                  ยาที่กำลังใช้
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.currentDrugs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">ไม่มีข้อมูลยา</p>
                ) : (
                  <div className="space-y-3">
                    {patient.currentDrugs.map((drug) => (
                      <div key={drug.id} className="flex items-start justify-between rounded-lg border p-3">
                        <div className="space-y-1">
                          <span className="font-medium text-sm">{drug.drugName}</span>
                          <p className="text-xs text-muted-foreground">
                            {drug.dosage ? `${drug.dosage} ` : ''}
                            {drug.frequency ? `${drug.frequency}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {drug.startDate ? `เริ่ม: ${formatDate(drug.startDate)}` : ''}
                            {drug.endDate ? ` · สิ้นสุด: ${formatDate(drug.endDate)}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lab Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FlaskConical className="h-4 w-4" />
                  ผลตรวจล่าสุด
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.recentLabs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">ไม่มีข้อมูลผลตรวจ</p>
                ) : (
                  <div className="space-y-3">
                    {patient.recentLabs.slice(0, 5).map((lab) => (
                      <div key={lab.id} className="flex items-start justify-between rounded-lg border p-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{lab.labName}</span>
                            {lab.abnormal && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0">ผิดปกติ</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {lab.labDate ? formatDate(lab.labDate) : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className={`text-sm font-semibold ${lab.abnormal ? 'text-destructive' : ''}`}>
                            {lab.result} {lab.unit || ''}
                          </p>
                          {lab.normalRange && (
                            <p className="text-[10px] text-muted-foreground">ปกติ: {lab.normalRange}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Visit History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  ประวัติการรักษา
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.recentVisits.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">ไม่มีประวัติการรักษา</p>
                ) : (
                  <div className="relative space-y-0">
                    {patient.recentVisits.map((visit, idx) => (
                      <div key={visit.id} className="flex gap-3 pb-4 relative">
                        {idx < patient.recentVisits.length - 1 && (
                          <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />
                        )}
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-background mt-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {visit.diagnosisName || 'ไม่ระบุการวินิจฉัย'}
                            </span>
                            {visit.visitType && (
                              <span className="text-xs text-muted-foreground">
                                ({visitTypeLabels[visit.visitType] || visit.visitType})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(visit.visitDate)}
                            {visit.hospitalCode ? ` · รพ. ${visit.hospitalCode}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: FFC */}
        <TabsContent value="ffc" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* FFC Visit History */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Home className="h-4 w-4" />
                  ประวัติการเยี่ยมบ้าน (FFC)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.recentFfcVisits.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    ยังไม่มีการเยี่ยมบ้าน (FFC) สำหรับผู้ป่วยรายนี้
                  </p>
                ) : (
                  <div className="space-y-4">
                    {patient.recentFfcVisits.map((visit) => (
                      <Card key={visit.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">
                                  {visitTypeLabels[visit.visitType] || visit.visitType}
                                </span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${visitStatusColors[visit.status] || ''}`}>
                                  {visit.status === 'COMPLETED' ? <CheckCircle2 className="h-3 w-3" /> : null}
                                  {visit.status === 'CANCELLED' ? <XCircle className="h-3 w-3" /> : null}
                                  {visit.status}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(visit.visitDate)}
                              </p>
                              {visit.notes && (
                                <p className="text-sm mt-1">{visit.notes}</p>
                              )}
                              {visit.user && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  โดย: {visit.user.displayName}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {visit.nextVisitDate && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="mr-1 h-3 w-3" />
                                  นัดครั้งหน้า: {formatDate(visit.nextVisitDate)}
                                </Badge>
                              )}
                              {visit.checkInLat && visit.checkInLng && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                                  <Link
                                    href={`https://www.google.com/maps?q=${visit.checkInLat},${visit.checkInLng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <MapPin className="h-3 w-3" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: แผนที่ */}
        <TabsContent value="map" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                ที่ตั้งของ {patient.fullName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(patient.lat || patient.house?.lat) && (patient.lng || patient.house?.lng) ? (
                <div className="space-y-4">
                  <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                    <iframe
                      title="Patient location"
                      src={`https://www.google.com/maps/embed/v1/place?key=&q=${patient.lat || patient.house?.lat},${patient.lng || patient.house?.lng}&center=${patient.lat || patient.house?.lat},${patient.lng || patient.house?.lng}&zoom=16&maptype=satellite`}
                      className="h-full w-full"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`https://www.google.com/maps/dir/?api=1&destination=${patient.lat || patient.house?.lat},${patient.lng || patient.house?.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        วางแผนการเดินทาง
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.info('เปิดในแอปแผนที่')}>
                      <MapPin className="mr-2 h-4 w-4" />
                      {patient.lat?.toFixed(6)}, {patient.lng?.toFixed(6)}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">ไม่พบข้อมูลพิกัดที่ตั้งสำหรับผู้ป่วยรายนี้</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
