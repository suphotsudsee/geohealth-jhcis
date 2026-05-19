'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Map,
  Home,
  Users,
  BarChart3,
  ClipboardCheck,
} from 'lucide-react'

const mobileNavItems = [
  { href: '/', label: 'แผนที่', icon: Map, exact: true },
  { href: '/households', label: 'ครัวเรือน', icon: Home },
  { href: '/patients', label: 'ผู้ป่วย', icon: Users },
  { href: '/dashboard', label: 'วิเคราะห์', icon: BarChart3 },
  { href: '/ffc', label: 'FFC', icon: ClipboardCheck },
]

export default function Navbar() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-md',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
