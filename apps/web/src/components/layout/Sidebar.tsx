'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Map,
  Home,
  Users,
  BarChart3,
  ClipboardCheck,
  FileText,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useFacilityInfo } from '@/hooks/useFacilityInfo'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { href: '/', label: 'แผนที่', icon: Map, exact: true },
  { href: '/households', label: 'ครัวเรือน', icon: Home },
  { href: '/patients', label: 'ผู้ป่วย', icon: Users },
  { href: '/dashboard', label: 'วิเคราะห์ข้อมูล', icon: BarChart3 },
  { href: '/ffc', label: 'FFC เยี่ยมบ้าน', icon: ClipboardCheck },
  { href: '/reports', label: 'รายงาน', icon: FileText },
  { href: '/admin', label: 'จัดการระบบ', icon: Shield, adminOnly: true },
]

function FacilityBrand({ facility }: { facility: ReturnType<typeof useFacilityInfo> }) {
  const locationLine = [facility.subDistrictName && `ต. ${facility.subDistrictName}`, facility.districtName && `อ. ${facility.districtName}`]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="min-w-0 leading-tight">
      <div className="truncate text-sm font-bold" title={facility.name}>
        {facility.name}
      </div>
      <div className="truncate text-xs font-medium text-muted-foreground" title={locationLine}>
        {locationLine || ' '}
      </div>
      <div className="truncate text-xs font-medium text-muted-foreground" title={facility.provinceName ?? ''}>
        {facility.provinceName ? `จ. ${facility.provinceName}` : ' '}
      </div>
    </div>
  )
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const facility = useFacilityInfo()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'hidden border-r bg-card transition-all duration-300 md:flex md:flex-col',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center border-b px-4',
          collapsed ? 'h-14' : 'h-20',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            <FacilityBrand facility={facility} />
          </Link>
        )}
        {collapsed && (
          <Link href="/">
            <Map className="h-5 w-5 text-primary" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Nav Links */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {navItems
            .filter(
              (item) =>
                !item.adminOnly ||
                user?.role === 'ADMIN'
            )
            .map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
        </nav>
      </ScrollArea>
    </aside>
  )
}
