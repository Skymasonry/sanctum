"use client"

import { useEffect, useMemo, useState } from "react"

import type { ThresholdData } from "@/types/threshold"

import { DashboardChamberGrid } from "./DashboardChamberGrid"
import { LiveBand } from "./LiveBand"
import { ThresholdHeader } from "./ThresholdHeader"

interface ThresholdDashboardProps {
  initialData: ThresholdData
}

export function ThresholdDashboard({ initialData }: ThresholdDashboardProps) {
  const [data, setData] = useState<ThresholdData>(initialData)

  // Poll every 30s so counts and live-band stay fresh without a manual refresh.
  useEffect(() => {
    const tick = () => {
      fetch("/api/threshold", { cache: "no-store" })
        .then(r => (r.ok ? r.json() : null))
        .then(d => d && setData(d))
        .catch(() => {})
    }
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  const activeStirringCount = useMemo(
    () =>
      data.stirring.filter(
        g => g.unreadMessages + g.newFiles + g.eventChanges + g.presentNow > 0,
      ).length,
    [data.stirring],
  )

  return (
    <div className="flex flex-col">
      <ThresholdHeader
        member={data.member}
        stirringCount={activeStirringCount}
        gatheringsCount={data.gatherings.length}
      />

      {data.live.length > 0 && <LiveBand rooms={data.live} />}

      <div className="px-10 pt-8">
        <DashboardChamberGrid stirring={data.stirring} />
      </div>
    </div>
  )
}
