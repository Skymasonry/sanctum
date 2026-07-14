"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

interface UnprovisionedChamberProps {
  guildId: string
  spaceType: "chat" | "calendar" | "folder"
  chamberLabel: string
  bodyLine?: string
  isSeeder: boolean
}

/**
 * Renders when a chamber's underlying resource hasn't been provisioned
 * yet for this guild (e.g. no talkRoom, no calendarUri, no folderId).
 *
 * Only the seeder sees an active Provision button — everyone else gets
 * a message saying to ask them (the backend also enforces this).
 */
export function UnprovisionedChamber({
  guildId,
  spaceType,
  chamberLabel,
  bodyLine,
  isSeeder,
}: UnprovisionedChamberProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const provision = () => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/guilds/${guildId}/spaces`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: spaceType }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `HTTP ${res.status}`)
        }
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to provision")
      }
    })
  }

  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-dark/70 text-center">
      <div className="px-6 py-10">
        <p className="font-display text-lg tracking-[0.03em] text-gray">
          No {chamberLabel} yet.
        </p>
        {bodyLine && (
          <p className="mt-2 max-w-md text-sm text-faint">{bodyLine}</p>
        )}
        <div className="mt-6">
          {isSeeder ? (
            <button
              type="button"
              onClick={provision}
              disabled={pending}
              className="rounded-md border border-guild/40 bg-guild/10 px-4 py-2 font-mono text-[10px] font-medium tracking-[0.14em] text-guild uppercase transition hover:bg-guild/20 disabled:opacity-50"
            >
              {pending ? "Provisioning…" : `Provision ${chamberLabel}`}
            </button>
          ) : (
            <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
              Ask the seeder to open one
            </p>
          )}
          {error && (
            <p className="mt-3 font-mono text-[10px] text-danger">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
