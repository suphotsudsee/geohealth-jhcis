'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, MapPin, Loader2 } from 'lucide-react'
import { useMap } from 'react-leaflet'

import { useDebounce } from '@/hooks/useDebounce'
import { useMapStore } from '@/stores/map.store'
import { cn, getRiskColor } from '@/lib/utils'
import type { PatientSummary } from '@/types/api'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// ── Search function ──
async function searchPatients(query: string): Promise<PatientSummary[]> {
  const res = await fetch(`/api/v1/patients/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

// ── Thai risk labels ──
const RISK_LABEL: Record<string, string> = {
  CRITICAL: 'วิกฤต',
  HIGH: 'สูง',
  MEDIUM: 'ปานกลาง',
  NORMAL: 'ปกติ',
}

const RISK_BADGE_VARIANT: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  CRITICAL: 'destructive',
  HIGH: 'default',
  MEDIUM: 'secondary',
  NORMAL: 'outline',
}

// ── Props ──
export interface SearchBoxProps {
  placeholder?: string
  className?: string
}

/**
 * SearchBox — search for patients by name or CID.
 * Integrated with TanStack Query + debounced input.
 * On selection, flies to patient location and selects the marker.
 */
export default function SearchBox({
  placeholder = 'ค้นหาผู้ป่วย...',
  className,
}: SearchBoxProps) {
  const map = useMap()
  const selectMarker = useMapStore((s) => s.selectMarker)

  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const debouncedQuery = useDebounce(query, 300)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // TanStack Query
  const {
    data: results = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['patient-search', debouncedQuery],
    queryFn: () => searchPatients(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
    select: (data) => data ?? [],
  })

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIndex(-1)
  }, [results])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fly to patient on select
  const handleSelect = useCallback(
    (patient: PatientSummary) => {
      setQuery('')
      setIsOpen(false)
      setHighlightIndex(-1)
      inputRef.current?.blur()

      if (patient.lat && patient.lng) {
        map.flyTo([patient.lat, patient.lng], 16, { duration: 1 })
        selectMarker(patient.id)
      }
    },
    [map, selectMarker],
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0,
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1,
          )
          break
        case 'Enter':
          e.preventDefault()
          if (highlightIndex >= 0 && highlightIndex < results.length) {
            handleSelect(results[highlightIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          inputRef.current?.blur()
          break
      }
    },
    [isOpen, results, highlightIndex, handleSelect],
  )

  const showDropdown = isOpen && debouncedQuery.length >= 2
  const searching = isLoading || isFetching

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute left-4 top-4 z-[1000] w-[320px] sm:w-[360px]',
        className,
      )}
    >
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-10 pl-9 pr-8 text-sm shadow-md"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setIsOpen(false)
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div className="mt-1 max-h-[320px] overflow-y-auto rounded-lg border bg-card shadow-xl">
          {/* Loading state */}
          {searching && (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {!searching && results.length === 0 && debouncedQuery.length >= 2 && (
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              ไม่พบผู้ป่วย &quot;{debouncedQuery}&quot;
            </div>
          )}

          {/* Results list */}
          {!searching && results.length > 0 && (
            <ul className="py-1" role="listbox">
              {results.map((patient, idx) => (
                <li
                  key={patient.id}
                  role="option"
                  aria-selected={highlightIndex === idx}
                  onClick={() => handleSelect(patient)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                    highlightIndex === idx
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50',
                  )}
                >
                  {/* Location icon or risk dot */}
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: getRiskColor(patient.riskLevel) }}
                  />

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">
                      {patient.fullName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        patient.cid && `CID: ${patient.cid}`,
                        patient.age && `อายุ ${patient.age} ปี`,
                        patient.house?.houseNo && `บ้านเลขที่ ${patient.house.houseNo}`,
                        patient.house?.village?.name,
                      ]
                        .filter(Boolean)
                        .join(' | ')}
                    </p>
                  </div>

                  {/* Risk badge */}
                  <Badge
                    variant={RISK_BADGE_VARIANT[patient.riskLevel] || 'outline'}
                    className="flex-shrink-0 text-[10px]"
                  >
                    {RISK_LABEL[patient.riskLevel] || patient.riskLevel}
                  </Badge>

                  {/* Map pin indicator */}
                  {patient.lat && patient.lng && (
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Results count */}
          {results.length > 0 && (
            <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
              พบ {results.length} รายการ
            </div>
          )}
        </div>
      )}
    </div>
  )
}
