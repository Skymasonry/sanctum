"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"

interface DangerZoneProps {
  guildId: string
  guildName: string
}

/**
 * Guild destruction — seeder or steward only (enforced server-side too).
 * Deliberately friction-heavy: type the guild's exact name to confirm,
 * since this is the one action here with no undo.
 */
export function DangerZone({ guildId, guildName }: DangerZoneProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const destroy = () => {
    setError(null)
    start(async () => {
      try {
        const res = await fetch(`/api/guilds/${guildId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmName: guildName }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `HTTP ${res.status}`)
        }
        router.push("/")
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to destroy guild")
      }
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-danger/40 px-4 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
      >
        <AlertTriangle className="h-4 w-4" />
        Destroy this guild
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-danger/40 bg-danger/5 p-4">
      <p className="text-sm text-gray-light">
        This permanently deletes <span className="text-white">{guildName}</span> — members,
        scrolls, quests, and chamber links. There is no undo. Type the guild&apos;s name to confirm.
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={e => setConfirmText(e.target.value)}
        placeholder={guildName}
        className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-danger focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={destroy}
          disabled={confirmText !== guildName || pending}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/80 disabled:opacity-50"
        >
          {pending ? "Destroying…" : "Permanently destroy"}
        </button>
        <button
          type="button"
          onClick={() => { setConfirming(false); setConfirmText(""); setError(null) }}
          className="text-sm text-gray hover:text-white"
        >
          Cancel
        </button>
      </div>
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  )
}
