import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: React.ReactNode
  message: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export default function EmptyState({
  icon,
  message,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-center',
        className
      )}
    >
      <div className="text-muted-foreground">
        {icon || <Inbox size={48} />}
      </div>
      <p className="text-lg font-medium text-foreground">{message}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
