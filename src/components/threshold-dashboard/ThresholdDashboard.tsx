"use client"

import { useEffect, useMemo, useState } from "react"

import type { ThresholdData } from "@/types/threshold"

import { GatheringsColumn } from "./GatheringsColumn"
import { LiveBand } from "./LiveBand"
import { StirringColumn } from "./StirringColumn"
import { ThresholdHeader } from "./ThresholdHeader"

interface ThresholdDashboardProps {
  initialData: ThresholdData
}

export function ThresholdDashboard({ initialData }: ThresholdDashboardProps) {
  const [data, setData] = useState<ThresholdData>(initialData)

  // Poll every 30s for live-band + counts freshness. Cheap since the endpoint
  // returns only counts.
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

  const activeStirring = useMemo(
    () =>
      data.stirring.filter(
        g => g.unreadMessages + g.newFiles + g.eventChanges + g.presentNow > 0,
      ),
    [data.stirring],
  )
  const quietStirring = useMemo(
    () =>
      data.stirring.filter(
        g => g.unreadMessages + g.newFiles + g.eventChanges + g.presentNow === 0,
      ),
    [data.stirring],
  )

  return (
    <div className="flex flex-col">
      <ThresholdHeader
        member={data.member}
        stirringCount={activeStirring.length}
        gatheringsCount={data.gatherings.length}
      />

      {data.live.length > 0 && <LiveBand rooms={data.live} />}

      <div className="grid grid-cols-1 gap-9 px-10 pt-8 lg:grid-cols-2">
        <StirringColumn active={activeStirring} quiet={quietStirring} />
        <GatheringsColumn gatherings={data.gatherings} />
      </div>
    </div>
  )
}
