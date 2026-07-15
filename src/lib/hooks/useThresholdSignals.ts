"use client"

import { useEffect, useState } from "react"

import type { ThresholdData } from "@/types/threshold"

export interface GuildSignal {
  hasUnread: boolean
  isLive: boolean
}

/**
 * Polls /api/threshold and returns a lookup of per-guild signal state.
 * Does not touch lastSeen; use ?touch=1 only when the dashboard is first
 * entered. Falls back to an empty map on error so the UI stays stable.
 */
export function useThresholdSignals(intervalMs = 30_000): Map<string, GuildSignal> {
  const [signals, setSignals] = useState<Map<string, GuildSignal>>(new Map())

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch("/api/threshold", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as ThresholdData
        if (cancelled) return
        const next = new Map<string, GuildSignal>()
        for (const g of data.stirring) {
          next.set(g.guildId, {
            hasUnread:
              g.unreadMessages + g.newFiles + g.eventChanges + g.openQuests + g.pendingScrolls >
              0,
            isLive: g.presentNow > 0,
          })
        }
        for (const room of data.live) {
          const prev = next.get(room.guildId) ?? { hasUnread: false, isLive: false }
          next.set(room.guildId, { ...prev, isLive: true })
        }
        setSignals(next)
      } catch {
        // swallow — keep last known signals
      }
    }

    load()
    const id = setInterval(load, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [intervalMs])

  return signals
}
