// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'next/navigation'
import {
  Users, Shield, Plus, Search, UserPlus, Pencil,
  Trash2, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Eye, EyeOff
} from 'lucide-react'

interface UserData {
  id: string
  username: string
  displayName: string
  email: string | null
  phone: string | null
  role: string
  villageCode: string | null
  districtCode: string | null
  provinceCode: string | null
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
}

interface CreateUserPayload {
  username: string
  password: string
  displayName: string
  role: string
  email: string
  phone: string
  villageCode: string
  districtCode: string
  provinceCode: string
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'ผู้ดูแลระบบ', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  { value: 'DISTRICT', label: 'ระดับอำเภอ', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  { value: 'HOSPITAL', label: 'รพ.สต.', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
  { value: 'FFC', label: 'FFC', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { value: 'VIEWER', label: 'ผู้ดู', color: 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300' },
]

const DEFAULT_FORM: CreateUserPayload = {
  username: '',
  password: '',
  displayName: '',
  role: 'FFC',
  email: '',
  phone: '',
  villageCode: '',
  districtCode: '',
  provinceCode: '',
}

function getRoleBadge(role: string) {
  const opt = ROLE_OPTIONS.find(r => r.value === role)
  if (!opt) return null
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${opt.color}`}>{opt.label}</span>
}

export default function AdminUsersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateUserPayload>(DEFAULT_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      router.push('/admin')
    }
  }, [user, router])

  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', page, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (roleFilter) params.set('role', roleFilter)
      const res = await fetch(`/api/v1/admin/users?${params}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json()
    },
    enabled: user?.role === 'ADMIN',
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateUserPayload) => {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Failed to create user')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('สร้างผู้ใช้สำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setDialogOpen(false)
      setForm(DEFAULT_FORM)
    },
    onError: (error) => {
      toast.error('สร้างผู้ใช้ไม่สำเร็จ', { description: error.message })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateUserPayload & { isActive: boolean }> }) => {
      const res = await fetch(`/api/v1/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Failed to update user')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('อัปเดตผู้ใช้สำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setDialogOpen(false)
      setEditUserId(null)
      setForm(DEFAULT_FORM)
    },
    onError: (error) => {
      toast.error('อัปเดตไม่สำเร็จ', { description: error.message })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/admin/users/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Failed to deactivate user')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('ปิดใช้งานผู้ใช้สำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error) => {
      toast.error('ปิดใช้งานไม่สำเร็จ', { description: error.message })
    },
  })

  function handleEdit(user: UserData) {
    setEditUserId(user.id)
    setForm({
      username: user.username,
      password: '',
      displayName: user.displayName,
      role: user.role,
      email: user.email || '',
      phone: user.phone || '',
      villageCode: user.villageCode || '',
      districtCode: user.districtCode || '',
      provinceCode: user.provinceCode || '',
    })
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (editUserId) {
      const payload: Partial<CreateUserPayload & { isActive: boolean }> = {
        displayName: form.displayName,
        role: form.role,
        email: form.email,
        phone: form.phone,
        villageCode: form.villageCode,
        districtCode: form.districtCode,
        provinceCode: form.provinceCode,
      }
      if (form.password) payload.password = form.password
      updateMutation.mutate({ id: editUserId, data: payload })
    } else {
      createMutation.mutate(form)
    }
  }

  const users: UserData[] = usersData?.data || []
  const pagination = usersData?.pagination
  const isMutating = createMutation.isPending || updateMutation.isPending

  if (user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4">
        <Shield className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">ไม่มีสิทธิ์เข้าถึง</h2>
        <p className="text-sm text-muted-foreground">เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้น</p>
        <Button onClick={() => router.push('/admin')}>กลับ</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-sm text-muted-foreground">
            จัดการบัญชีผู้ใช้ในระบบ ทั้งหมด {pagination?.total || 0} คน
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditUserId(null)
            setForm(DEFAULT_FORM)
            setShowPassword(false)
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มผู้ใช้
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editUserId ? 'แก้ไขผู้ใช้' : 'สร้างผู้ใช้ใหม่'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>ชื่อผู้ใช้ *</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="username"
                  disabled={!!editUserId}
                />
              </div>
              <div className="space-y-2">
                <Label>{editUserId ? 'รหัสผ่าน (เว้นว่างไว้ไม่เปลี่ยน)' : 'รหัสผ่าน *'}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="min 6 characters"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>ชื่อที่แสดง *</Label>
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="ชื่อ-นามสกุล"
                />
              </div>
              <div className="space-y-2">
                <Label>บทบาท *</Label>
                <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>อีเมล</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>เบอร์โทร</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="08x-xxx-xxxx"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>รหัสตำบล</Label>
                  <Input
                    value={form.villageCode}
                    onChange={(e) => setForm(f => ({ ...f, villageCode: e.target.value }))}
                    placeholder="12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label>รหัสอำเภอ</Label>
                  <Input
                    value={form.districtCode}
                    onChange={(e) => setForm(f => ({ ...f, districtCode: e.target.value }))}
                    placeholder="1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label>รหัสจังหวัด</Label>
                  <Input
                    value={form.provinceCode}
                    onChange={(e) => setForm(f => ({ ...f, provinceCode: e.target.value }))}
                    placeholder="12"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setDialogOpen(false); setEditUserId(null); setForm(DEFAULT_FORM) }}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isMutating || (!editUserId && (!form.username || !form.password || !form.displayName))}
              >
                {isMutating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {editUserId ? 'บันทึก' : 'สร้าง'}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="w-[250px] pl-8"
                  placeholder="ค้นหาด้วยชื่อผู้ใช้หรือชื่อ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">บทบาท</Label>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">ทั้งหมด</SelectItem>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              รีเฟรช
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">ไม่พบผู้ใช้</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มผู้ใช้แรก
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อผู้ใช้</TableHead>
                  <TableHead>ชื่อแสดง</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>เข้าสู่ระบบล่าสุด</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users
                  .filter((u) => {
                    if (!searchQuery) return true
                    const q = searchQuery.toLowerCase()
                    return (
                      u.username.toLowerCase().includes(q) ||
                      u.displayName.toLowerCase().includes(q) ||
                      u.email?.toLowerCase().includes(q)
                    )
                  })
                  .map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-sm">{u.username}</TableCell>
                      <TableCell className="font-medium">{u.displayName}</TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? 'default' : 'secondary'} className={u.isActive ? 'bg-green-600' : ''}>
                          {u.isActive ? (
                            <><CheckCircle2 className="mr-1 h-3 w-3" /> ใช้งาน</>
                          ) : (
                            <><XCircle className="mr-1 h-3 w-3" /> ปิดใช้งาน</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'ไม่เคย'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {u.isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`ปิดการใช้งานผู้ใช้ "${u.displayName}"?`)) {
                                  deactivateMutation.mutate(u.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            หน้า {pagination.page} จาก {pagination.totalPages} · ทั้งหมด {pagination.total} คน
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              ถัดไป
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
