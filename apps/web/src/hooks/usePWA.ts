'use client'
import { useState, useEffect } from 'react'

export function usePWA() {
  const [isPWA, setIsPWA] = useState(false)

  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia(
        '(display-mode: standalone)'
      ).matches
      setIsPWA(isStandalone)
    }

    checkPWA()

    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkPWA)

    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkPWA)
    }
  }, [])

  return { isPWA }
}
