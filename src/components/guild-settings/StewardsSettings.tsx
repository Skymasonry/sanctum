"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

interface StewardsSettingsProps {
  guildId: string
  stewards: string[]
  members: string[]
}

/**
 * Editable by the seeder or any current steward — enforced by the
 * API, not just hidden here. Stewards are the ongoing pattern-integrity
 * role (plural, can change hands); the seeder stays a single, fixed
 * founding record.
 */
export function StewardsSettings({ guildId, stewards, members }: StewardsSettingsProps) {
  const router = useRouter()
  const [newSteward, setNewSteward] = useState("")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const candidates = members.filter(m => !stewards.some(s => s.toLowerCase() === m.toLowerCase()))

  const add = () => {
    if (!newSteward.trim()) return
    setError(null)
    start(async () => {
      try {
        const res = await fetch(`/api/guilds/${guildId}/stewards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: newSteward.trim() }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setNewSteward("")
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add steward")
      }
    })
  }

  const remove = (userId: string) => {
    setError(null)
    start(async () => {
      try {
        const res = await fetch(`/api/guilds/${guildId}/stewards`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove steward")
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {stewards.length === 0 ? (
        <p className="text-sm italic text-faint">No stewards yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {stewards.map(s => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-dark bg-black-deep px-3 py-1 text-sm text-gray-light"
            >
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                disabled={pending}
                className="text-faint transition hover:text-danger disabled:opacity-50"
                aria-label={`Remove ${s} as steward`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          value={newSteward}
          onChange={e => setNewSteward(e.target.value)}
          className="flex-1 rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"
        >
          <option value="">Choose a member…</option>
          {candidates.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!newSteward.trim() || pending}
          className="rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  )
}
