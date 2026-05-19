'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useOffline } from '@/hooks/useOffline'
import { useFFCStore } from '@/stores/ffc.store'
import { Wifi, WifiOff, List, RefreshCw } from 'lucide-react'

export default function OfflineIndicator() {
  const { isOnline } = useOffline()
  const pendingCount = useFFCStore((s) => s.pendingVisits.length)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isOnline && pendingCount === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <Wifi className="h-3 w-3" />
        <span>ออนไลน์</span>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors"
      >
        {isOnline ? (
          <>
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-green-600 dark:text-green-400">ออนไลน์</span>
          </>
        ) : (
          <>
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="text-yellow-600 dark:text-yellow-400">ออฟไลน์</span>
          </>
        )}
        {pendingCount > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
            {pendingCount}
          </Badge>
        )}
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>สถานะการซิงค์</DialogTitle>
            <DialogDescription>
              {isOnline
                ? 'คุณเชื่อมต่ออินเทอร์เน็ตแล้ว'
                : 'คุณกำลังใช้งานแบบออฟไลน์ — ข้อมูลจะถูกบันทึกไว้ในเครื่อง'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border p-3">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-yellow-500" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isOnline ? 'เชื่อมต่อแล้ว' : 'ออฟไลน์'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isOnline
                    ? 'สามารถซิงค์ข้อมูลได้'
                    : 'บันทึกการเยี่ยมจะถูกเก็บไว้ในเครื่อง'}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm">
                  <List className="h-4 w-4" />
                  รายการที่รอซิงค์
                </span>
                <Badge variant="secondary">{pendingCount}</Badge>
              </div>
              {pendingCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  มี {pendingCount} รายการที่ยังไม่ได้ซิงค์กับเซิร์ฟเวอร์
                </p>
              )}
            </div>

            {!isOnline && (
              <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                เมื่อเชื่อมต่ออินเทอร์เน็ต ข้อมูลจะถูกซิงค์โดยอัตโนมัติ
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
