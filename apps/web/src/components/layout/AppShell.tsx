// @ts-nocheck
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import Sidebar from './Sidebar'
import Header from './Header'
import Navbar from './Navbar'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">เมนูนำทาง</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center border-b px-4">
              <span className="text-lg font-bold">GeoHealth</span>
            </div>
            <ScrollArea className="flex-1 px-2 py-4">
              {/* Reuse sidebar nav items via the same Sidebar component but in mobile mode */}
              <Sidebar
                collapsed={false}
                onToggle={() => setMobileMenuOpen(false)}
              />
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        <main
          className={cn(
            'flex-1 overflow-auto',
            'pb-16 md:pb-0' // bottom nav padding on mobile
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <Navbar />
    </div>
  )
}
