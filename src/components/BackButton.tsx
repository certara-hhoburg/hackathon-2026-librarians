'use client'

import { useRouter } from 'next/navigation'
import React, { useCallback } from 'react'

type Props = {
  fallbackHref?: string
  label?: string
}

function canGoBackInApp(): boolean {
  if (typeof window === 'undefined') return false

  const idx = (window.history.state as { idx?: number } | null)?.idx
  if (typeof idx === 'number') return idx > 0

  try {
    const ref = document.referrer
    if (ref && new URL(ref).origin === window.location.origin) return true
  } catch {
    // ignore invalid referrer
  }

  return false
}

/**
 * Goes to the previous history entry when possible (e.g. main guide → embedded recipe → back).
 * Falls back to Home (or `fallbackHref`) when the user landed here directly.
 */
export function BackButton({ fallbackHref = '/', label = 'Back' }: Props) {
  const router = useRouter()

  const onClick = useCallback(() => {
    if (canGoBackInApp()) {
      router.back()
      return
    }
    router.push(fallbackHref)
  }, [fallbackHref, router])

  return (
    <button type="button" className="back" onClick={onClick}>
      ← {label}
    </button>
  )
}
