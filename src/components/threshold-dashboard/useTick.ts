"use client"

import { useSyncExternalStore } from "react"

/**
 * Subscribes to a ticking clock. Returns Date.now() on the client and null
 * during SSR so time-dependent UI doesn't hydration-mismatch.
 */
export function useTick(intervalMs: number): number | null {
  return useSyncExternalStore(
    subscribe => {
      const id = setInterval(subscribe, intervalMs)
      return () => clearInterval(id)
    },
    () => Date.now(),
    () => null,
  )
}
