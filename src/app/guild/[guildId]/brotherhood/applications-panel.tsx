"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle } from "lucide-react"
import { Card, CardTitle } from "@/components/shared"
import type { GuildApplication } from "@/types/guild"

interface ApplicationsPanelProps {
  guildId: string
  applications: GuildApplication[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ApplicationsPanel({ guildId, applications }: ApplicationsPanelProps) {
  const router = useRouter()
  const [pending, setPending] = useState<Record<string, "approving" | "rejecting">>({})
  const [done, setDone] = useState<Record<string, "approved" | "rejected">>({})

  async function handleAction(memberId: string, action: "approve" | "reject") {
    setPending((p) => ({ ...p, [memberId]: action === "approve" ? "approving" : "rejecting" }))
    try {
      const res = await fetch(`/api/guilds/${guildId}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      })
      if (!res.ok) throw new Error(await res.text())
      setDone((d) => ({ ...d, [memberId]: action === "approve" ? "approved" : "rejected" }))
      router.refresh()
    } catch (err) {
      console.error(`Failed to ${action}:`, err)
    } finally {
      setPending((p) => {
        const next = { ...p }
        delete next[memberId]
        return next
      })
    }
  }

  const visible = applications.filter((a) => !done[a.userId])

  if (visible.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-guild">
        Pending Applications ({visible.length})
      </h2>
      <div className="flex flex-col gap-3">
        {visible.map((app) => {
          const busy = !!pending[app.userId]
          return (
            <Card key={app.userId}>
              <div className="flex items-start gap-4">
                <img
                  src={`/api/avatar/${app.userId}/40`}
                  alt={app.userId}
                  className="h-10 w-10 flex-shrink-0 rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <CardTitle>{app.userId}</CardTitle>
                  <p className="mt-0.5 text-xs text-gray">Applied {formatDate(app.appliedAt)}</p>
                  {app.message && (
                    <p className="mt-2 text-sm text-gray-light leading-relaxed">{app.message}</p>
                  )}
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    onClick={() => handleAction(app.userId, "approve")}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg bg-guild px-3 py-1.5 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {pending[app.userId] === "approving" ? "Approving…" : "Approve"}
                  </button>
                  <button
                    onClick={() => handleAction(app.userId, "reject")}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-dark px-3 py-1.5 text-sm text-gray transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    {pending[app.userId] === "rejecting" ? "Rejecting…" : "Reject"}
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
