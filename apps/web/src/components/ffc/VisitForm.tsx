// @ts-nocheck
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VISIT_TYPES } from '@/lib/constants'
import { useFFCStore, type OfflineVisit } from '@/stores/ffc.store'
import { useOffline } from '@/hooks/useOffline'
import { useDebounce } from '@/hooks/useDebounce'
import { toast } from 'sonner'
import {
  Search,
  Camera,
  Mic,
  MicOff,
  X,
  MapPin,
  Calendar,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'

const visitFormSchema = z.object({
  patientId: z.string().min(1, 'เลือกผู้ป่วย'),
  patientName: z.string().min(1, 'เลือกผู้ป่วย'),
  houseId: z.string().optional(),
  visitDate: z.string().min(1, 'เลือกวันที่เยี่ยม'),
  checkInLat: z.number().optional(),
  checkInLng: z.number().optional(),
  visitType: z.enum(VISIT_TYPES),
  notes: z.string().optional(),
  nextVisitDate: z.string().optional(),
})

type VisitFormValues = z.infer<typeof visitFormSchema>

interface PatientSearchResult {
  id: string
  fullName: string
  cid?: string | null
  age?: number | null
  gender?: string | null
  riskLevel: string
  house?: { id: string; houseNo?: string | null; village?: { name?: string | null } } | null
  lat?: number | null
  lng?: number | null
}

interface VisitFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultPatientId?: string
  defaultPatientName?: string
}

export default function VisitForm({
  open,
  onOpenChange,
  onSuccess,
  defaultPatientId,
  defaultPatientName,
}: VisitFormProps) {
  const { isOnline } = useOffline()
  const addPendingVisit = useFFCStore((s) => s.addPendingVisit)
  const [submitting, setSubmitting] = useState(false)
  const [checklist, setChecklist] = useState<Record<string, unknown>>({})
  const [photos, setPhotos] = useState<string[]>([])
  const [voiceNote, setVoiceNote] = useState<string | undefined>()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Patient search
  const [patientQuery, setPatientQuery] = useState('')
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([])
  const [searchingPatient, setSearchingPatient] = useState(false)
  const debouncedQuery = useDebounce(patientQuery, 400)

  // GPS
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsLat, setGpsLat] = useState<number | undefined>()
  const [gpsLng, setGpsLng] = useState<number | undefined>()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VisitFormValues>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      patientId: defaultPatientId || '',
      patientName: defaultPatientName || '',
      visitDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      visitType: 'ROUTINE',
    },
  })

  const selectedPatientId = watch('patientId')
  const selectedPatientName = watch('patientName')
  const visitType = watch('visitType')

  // Search patients
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setPatientResults([])
      return
    }

    const searchPatients = async () => {
      setSearchingPatient(true)
      try {
        const res = await fetch(
          `/api/v1/patients/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`
        )
        const json = await res.json()
        if (json.success && json.data) {
          setPatientResults(json.data)
        }
      } catch {
        // Silent fail
      } finally {
        setSearchingPatient(false)
      }
    }

    searchPatients()
  }, [debouncedQuery])

  // Get GPS location
  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('เบราว์เซอร์นี้ไม่รองรับ GPS')
      return
    }

    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setGpsLat(lat)
        setGpsLng(lng)
        setValue('checkInLat', lat)
        setValue('checkInLng', lng)
        setGpsLoading(false)
        toast.success('ระบุตำแหน่งเรียบร้อย')
      },
      () => {
        setGpsLoading(false)
        toast.error('ไม่สามารถระบุตำแหน่งได้')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [setValue])

  // Photo capture
  const handlePhotoCapture = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.multiple = true

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files) return

      const newPhotos: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const reader = new FileReader()
        const dataUri = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
        newPhotos.push(dataUri)
      }

      setPhotos((prev) => [...prev, ...newPhotos])
    }

    input.click()
  }, [])

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        const reader = new FileReader()
        reader.onload = () => {
          setVoiceNote(reader.result as string)
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingDuration(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)
    } catch {
      toast.error('ไม่สามารถเข้าถึงไมโครโฟน')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
    }
  }, [])

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Update checklist when visit type changes
  useEffect(() => {
    const defaultChecklist: Record<string, unknown> = {}
    if (visitType === 'ROUTINE' || visitType === 'FOLLOW_UP') {
      defaultChecklist.bloodPressure = ''
      defaultChecklist.bloodSugar = ''
      defaultChecklist.weight = ''
      defaultChecklist.medicationAdherence = 'yes'
      defaultChecklist.generalCondition = 'normal'
    }
    if (visitType === 'FOLLOW_UP') {
      defaultChecklist.woundCondition = 'normal'
    }
    if (visitType === 'EMERGENCY') {
      defaultChecklist.priority = 'medium'
      defaultChecklist.symptoms = ''
      defaultChecklist.actionTaken = ''
    }
    if (visitType === 'ASSESSMENT') {
      defaultChecklist.environment = ''
      defaultChecklist.familySupport = ''
      defaultChecklist.economicStatus = ''
    }
    setChecklist(defaultChecklist)
  }, [visitType])

  const onSubmit = async (data: VisitFormValues) => {
    setSubmitting(true)

    const visitData = {
      patientId: data.patientId,
      houseId: data.houseId,
      visitDate: data.visitDate,
      checkInLat: gpsLat || data.checkInLat,
      checkInLng: gpsLng || data.checkInLng,
      visitType: data.visitType,
      notes: data.notes,
      photos: photos,
      voiceNote: voiceNote,
      checklist: checklist,
      nextVisitDate: data.nextVisitDate || undefined,
    }

    try {
      if (isOnline) {
        const res = await fetch('/api/v1/ffc/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(visitData),
        })

        const json = await res.json()
        if (!json.success) {
          throw new Error(json.error?.message || 'Failed to create visit')
        }

        toast.success('บันทึกการเยี่ยมเรียบร้อย')
        reset()
        setPhotos([])
        setVoiceNote(undefined)
        setChecklist({})
        onOpenChange(false)
        onSuccess?.()
      } else {
        const offlineVisit: OfflineVisit = {
          offlineId: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          patientId: data.patientId,
          houseId: data.houseId,
          visitDate: data.visitDate,
          checkInLat: gpsLat || data.checkInLat,
          checkInLng: gpsLng || data.checkInLng,
          visitType: data.visitType,
          notes: data.notes,
          photos: photos,
          voiceNote: voiceNote,
          checklist: checklist,
          createdAt: new Date().toISOString(),
        }

        addPendingVisit(offlineVisit)
        toast.success('บันทึกในโหมดออฟไลน์ (จะซิงค์เมื่อเชื่อมต่อ)')
        reset()
        setPhotos([])
        setVoiceNote(undefined)
        setChecklist({})
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectPatient = (patient: PatientSearchResult) => {
    setValue('patientId', patient.id)
    setValue('patientName', patient.fullName)
    if (patient.house?.id) {
      setValue('houseId', patient.house.id)
    }
    if (patient.lat && patient.lng) {
      setGpsLat(patient.lat)
      setGpsLng(patient.lng)
      setValue('checkInLat', patient.lat)
      setValue('checkInLng', patient.lng)
    }
    setPatientQuery('')
    setPatientResults([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>บันทึกการเยี่ยมบ้าน</DialogTitle>
          <DialogDescription>
            กรอกข้อมูลการเยี่ยมผู้ป่วยที่บ้าน
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Patient search */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ผู้ป่วย *</label>
            {selectedPatientId ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">{selectedPatientName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValue('patientId', '')
                    setValue('patientName', '')
                    setValue('houseId', undefined)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาด้วย CID หรือชื่อ..."
                  className="pl-9"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                />
                {searchingPatient && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
                )}
                {patientResults.length > 0 && (
                  <Card className="absolute z-10 mt-1 w-full shadow-lg">
                    <CardContent className="max-h-48 overflow-y-auto p-1">
                      {patientResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => handleSelectPatient(p)}
                        >
                          <div className="font-medium">{p.fullName}</div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {p.cid && <span>CID: {p.cid}</span>}
                            {p.age !== null && p.age !== undefined && <span>อายุ {p.age}</span>}
                            {p.house?.houseNo && <span>บ้าน {p.house.houseNo}</span>}
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            {errors.patientId && (
              <p className="text-xs text-destructive">{errors.patientId.message}</p>
            )}
          </div>

          {/* Visit date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">วันที่เยี่ยม *</label>
            <Input
              type="datetime-local"
              {...register('visitDate')}
            />
            {errors.visitDate && (
              <p className="text-xs text-destructive">{errors.visitDate.message}</p>
            )}
          </div>

          {/* GPS */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ตำแหน่ง GPS</label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getCurrentPosition}
                disabled={gpsLoading}
              >
                {gpsLoading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-1 h-4 w-4" />
                )}
                {gpsLoading ? 'กำลังระบุ...' : 'ระบุตำแหน่งปัจจุบัน'}
              </Button>
            </div>
            {gpsLat && gpsLng && (
              <p className="text-xs text-muted-foreground">
                {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}
              </p>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="ละติจูด"
                type="number"
                step="any"
                value={gpsLat ?? ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) {
                    setGpsLat(v)
                    setValue('checkInLat', v)
                  }
                }}
              />
              <Input
                placeholder="ลองจิจูด"
                type="number"
                step="any"
                value={gpsLng ?? ''}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) {
                    setGpsLng(v)
                    setValue('checkInLng', v)
                  }
                }}
              />
            </div>
          </div>

          {/* Visit type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ประเภทการเยี่ยม *</label>
            <Select
              value={watch('visitType')}
              onValueChange={(v) => setValue('visitType', v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                {VISIT_TYPES.map((vt) => (
                  <SelectItem key={vt} value={vt}>
                    {vt === 'ROUTINE' && 'เยี่ยมปกติ'}
                    {vt === 'FOLLOW_UP' && 'ติดตามผล'}
                    {vt === 'EMERGENCY' && 'ฉุกเฉิน'}
                    {vt === 'ASSESSMENT' && 'ประเมินสภาพ'}
                    {vt === 'OTHER' && 'อื่นๆ'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Checklist */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ข้อมูลสุขภาพ</label>
            <div className="rounded-md border p-3 space-y-3">
              {(visitType === 'ROUTINE' || visitType === 'FOLLOW_UP') && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">ความดัน (mmHg)</label>
                      <Input
                        placeholder="120/80"
                        value={(checklist.bloodPressure as string) || ''}
                        onChange={(e) =>
                          setChecklist((prev) => ({ ...prev, bloodPressure: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">น้ำตาล (mg/dL)</label>
                      <Input
                        placeholder="100"
                        value={(checklist.bloodSugar as string) || ''}
                        onChange={(e) =>
                          setChecklist((prev) => ({ ...prev, bloodSugar: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">น้ำหนัก (kg)</label>
                      <Input
                        placeholder="65"
                        value={(checklist.weight as string) || ''}
                        onChange={(e) =>
                          setChecklist((prev) => ({ ...prev, weight: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">กินยาตาม医嘱?</label>
                      <Select
                        value={(checklist.medicationAdherence as string) || 'yes'}
                        onValueChange={(v) =>
                          setChecklist((prev) => ({ ...prev, medicationAdherence: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">ได้</SelectItem>
                          <SelectItem value="no">ไม่ได้</SelectItem>
                          <SelectItem value="partial">บางครั้ง</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">สภาพทั่วไป</label>
                    <Select
                      value={(checklist.generalCondition as string) || 'normal'}
                      onValueChange={(v) =>
                        setChecklist((prev) => ({ ...prev, generalCondition: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">ปกติ</SelectItem>
                        <SelectItem value="good">ดี</SelectItem>
                        <SelectItem value="fair">ปานกลาง</SelectItem>
                        <SelectItem value="poor">แย่</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {visitType === 'FOLLOW_UP' && (
                <div>
                  <label className="text-xs text-muted-foreground">สภาพแผล</label>
                  <Select
                    value={(checklist.woundCondition as string) || 'normal'}
                    onValueChange={(v) =>
                      setChecklist((prev) => ({ ...prev, woundCondition: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">ปกติ</SelectItem>
                      <SelectItem value="infected">ติดเชื้อ</SelectItem>
                      <SelectItem value="healing">กำลังหาย</SelectItem>
                      <SelectItem value="deteriorating">แย่ลง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {visitType === 'EMERGENCY' && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">ระดับความสำคัญ</label>
                    <Select
                      value={(checklist.priority as string) || 'medium'}
                      onValueChange={(v) =>
                        setChecklist((prev) => ({ ...prev, priority: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">ต่ำ</SelectItem>
                        <SelectItem value="medium">ปานกลาง</SelectItem>
                        <SelectItem value="high">สูง</SelectItem>
                        <SelectItem value="critical">วิกฤต</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">อาการ</label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="ระบุอาการ..."
                      value={(checklist.symptoms as string) || ''}
                      onChange={(e) =>
                        setChecklist((prev) => ({ ...prev, symptoms: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">การดำเนินการ</label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="สิ่งที่ทำ..."
                      value={(checklist.actionTaken as string) || ''}
                      onChange={(e) =>
                        setChecklist((prev) => ({ ...prev, actionTaken: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}

              {visitType === 'ASSESSMENT' && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">สภาพแวดล้อม</label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="สภาพแวดล้อมที่อยู่อาศัย..."
                      value={(checklist.environment as string) || ''}
                      onChange={(e) =>
                        setChecklist((prev) => ({ ...prev, environment: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">การสนับสนุนจากครอบครัว</label>
                    <Select
                      value={(checklist.familySupport as string) || ''}
                      onValueChange={(v) =>
                        setChecklist((prev) => ({ ...prev, familySupport: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือก" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">ดี</SelectItem>
                        <SelectItem value="moderate">ปานกลาง</SelectItem>
                        <SelectItem value="poor">น้อย</SelectItem>
                        <SelectItem value="none">ไม่มี</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">สถานะเศรษฐกิจ</label>
                    <Select
                      value={(checklist.economicStatus as string) || ''}
                      onValueChange={(v) =>
                        setChecklist((prev) => ({ ...prev, economicStatus: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือก" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">ดี</SelectItem>
                        <SelectItem value="moderate">ปานกลาง</SelectItem>
                        <SelectItem value="poor">ยากจน</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">บันทึกเพิ่มเติม</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="บันทึกเพิ่มเติม..."
              {...register('notes')}
            />
          </div>

          {/* Photos */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">รูปถ่าย</label>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative">
                  <img
                    src={photo}
                    alt={`Photo ${i + 1}`}
                    className="h-20 w-20 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
                    onClick={() => removePhoto(i)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-20 w-20"
                onClick={handlePhotoCapture}
              >
                <Camera className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Voice note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">บันทึกเสียง</label>
            <div className="flex items-center gap-2">
              {isRecording ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={stopRecording}
                >
                  <MicOff className="mr-1 h-4 w-4" />
                  หยุด ({formatDuration(recordingDuration)})
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startRecording}
                >
                  <Mic className="mr-1 h-4 w-4" />
                  {voiceNote ? 'อัดใหม่' : 'อัดเสียง'}
                </Button>
              )}
              {voiceNote && !isRecording && (
                <Badge variant="secondary" className="gap-1">
                  <Mic className="h-3 w-3" />
                  มีบันทึกเสียง
                </Badge>
              )}
            </div>
          </div>

          {/* Next visit date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">นัดเยี่ยมครั้งต่อไป</label>
            <Input
              type="date"
              {...register('nextVisitDate')}
            />
          </div>

          {/* Offline indicator */}
          {!isOnline && (
            <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
              คุณกำลังใช้งานแบบออฟไลน์ — ข้อมูลจะถูกบันทึกไว้และซิงค์เมื่อเชื่อมต่อ
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึก'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
