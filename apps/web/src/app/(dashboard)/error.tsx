'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold text-foreground">
        เกิดข้อผิดพลาด
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง'}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          ลองอีกครั้ง
        </Button>
        <Button onClick={() => (window.location.href = '/')} variant="outline">
          กลับหน้าแรก
        </Button>
      </div>
    </div>
  )
}
