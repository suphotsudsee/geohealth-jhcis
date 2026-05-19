import LoadingSpinner from '@/components/shared/LoadingSpinner'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size={32} text="กำลังโหลด..." />
    </div>
  )
}
