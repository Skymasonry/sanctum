"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { ChambersToggle } from "@/components/shared"
import type { ChamberId } from "@/types/guild"

interface ChamberSettingsProps {
  guildId: string
  initial: ChamberId[]
}

export function ChamberSettings({ guildId, initial }: ChamberSettingsProps) {
  const router = useRouter()
  const [chambers, setChambers] = useState<Set<ChamberId>>(new Set(initial))
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null)

  const dirty =
    chambers.size !== initial.length || initial.some(id => !chambers.has(id))

  const toggle = (id: ChamberId) => {
    setChambers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setMsg(null)
  }

  const save = () => {
    setMsg(null)
    start(async () => {
      try {
        const res = await fetch(`/api/guilds/${guildId}/chambers`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chambers: Array.from(chambers) }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `HTTP ${res.status}`)
        }
        setMsg({ tone: "ok", text: "Saved" })
        router.refresh()
      } catch (e) {
        setMsg({ tone: "err", text: e instanceof Error ? e.message : "Save failed" })
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ChambersToggle value={chambers} onToggle={toggle} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save chambers"}
        </button>
        {msg && (
          <span className={`text-sm ${msg.tone === "ok" ? "text-success" : "text-danger"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  )
}
