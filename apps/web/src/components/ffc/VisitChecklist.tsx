// @ts-nocheck
'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { VisitType } from '@prisma/client'

interface ChecklistItem {
  key: string
  label: string
  type: 'number' | 'text' | 'select' | 'toggle'
  options?: { value: string; label: string }[]
  placeholder?: string
}

interface VisitChecklistProps {
  type: VisitType
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
}

const ROUTINE_ITEMS: ChecklistItem[] = [
  { key: 'bloodPressure', label: 'ความดันโลหิต (mmHg)', type: 'text', placeholder: '120/80' },
  { key: 'bloodSugar', label: 'น้ำตาลในเลือด (mg/dL)', type: 'number', placeholder: '100' },
  { key: 'weight', label: 'น้ำหนัก (kg)', type: 'number', placeholder: '65' },
  {
    key: 'medicationAdherence',
    label: 'การกินยาตาม医嘱',
    type: 'select',
    options: [
      { value: 'yes', label: 'ได้' },
      { value: 'no', label: 'ไม่ได้' },
      { value: 'partial', label: 'บางครั้ง' },
    ],
  },
  {
    key: 'generalCondition',
    label: 'สภาพทั่วไป',
    type: 'select',
    options: [
      { value: 'good', label: 'ดี' },
      { value: 'normal', label: 'ปกติ' },
      { value: 'fair', label: 'ปานกลาง' },
      { value: 'poor', label: 'แย่' },
    ],
  },
]

const FOLLOW_UP_ITEMS: ChecklistItem[] = [
  ...ROUTINE_ITEMS,
  {
    key: 'woundCondition',
    label: 'สภาพแผล',
    type: 'select',
    options: [
      { value: 'normal', label: 'ปกติ' },
      { value: 'healing', label: 'กำลังหาย' },
      { value: 'infected', label: 'ติดเชื้อ' },
      { value: 'deteriorating', label: 'แย่ลง' },
    ],
  },
]

const EMERGENCY_ITEMS: ChecklistItem[] = [
  {
    key: 'priority',
    label: 'ระดับความสำคัญ',
    type: 'select',
    options: [
      { value: 'low', label: 'ต่ำ' },
      { value: 'medium', label: 'ปานกลาง' },
      { value: 'high', label: 'สูง' },
      { value: 'critical', label: 'วิกฤต' },
    ],
  },
  { key: 'symptoms', label: 'อาการ', type: 'text', placeholder: 'ระบุอาการที่พบ...' },
  { key: 'actionTaken', label: 'การดำเนินการ', type: 'text', placeholder: 'สิ่งที่ได้ทำ...' },
]

const ASSESSMENT_ITEMS: ChecklistItem[] = [
  { key: 'environment', label: 'สภาพแวดล้อมที่อยู่อาศัย', type: 'text', placeholder: 'สภาพแวดล้อม...' },
  {
    key: 'familySupport',
    label: 'การสนับสนุนจากครอบครัว',
    type: 'select',
    options: [
      { value: 'good', label: 'ดี' },
      { value: 'moderate', label: 'ปานกลาง' },
      { value: 'poor', label: 'น้อย' },
      { value: 'none', label: 'ไม่มี' },
    ],
  },
  {
    key: 'economicStatus',
    label: 'สถานะเศรษฐกิจ',
    type: 'select',
    options: [
      { value: 'good', label: 'ดี' },
      { value: 'moderate', label: 'ปานกลาง' },
      { value: 'poor', label: 'ยากจน' },
    ],
  },
]

const OTHER_ITEMS: ChecklistItem[] = ROUTINE_ITEMS

function getItemsForType(type: VisitType): ChecklistItem[] {
  switch (type) {
    case 'ROUTINE':
      return ROUTINE_ITEMS
    case 'FOLLOW_UP':
      return FOLLOW_UP_ITEMS
    case 'EMERGENCY':
      return EMERGENCY_ITEMS
    case 'ASSESSMENT':
      return ASSESSMENT_ITEMS
    default:
      return OTHER_ITEMS
  }
}

export default function VisitChecklist({
  type,
  values,
  onChange,
}: VisitChecklistProps) {
  const items = getItemsForType(type)

  const updateValue = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key} className="space-y-1">
          <label className="text-sm font-medium">{item.label}</label>
          {item.type === 'select' && item.options ? (
            <Select
              value={(values[item.key] as string) || ''}
              onValueChange={(v) => updateValue(item.key, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`เลือก${item.label}`} />
              </SelectTrigger>
              <SelectContent>
                {item.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={item.type === 'number' ? 'number' : 'text'}
              placeholder={item.placeholder}
              value={(values[item.key] as string) || ''}
              onChange={(e) => updateValue(item.key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
