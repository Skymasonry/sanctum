"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

interface InfoSettingsProps {
  guildId: string
  initialName: string
  initialDescription: string
}

export function InfoSettings({
  guildId,
  initialName,
  initialDescription,
}: InfoSettingsProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null)

  const dirty = name.trim() !== initialName || description !== initialDescription

  const save = () => {
    setMsg(null)
    start(async () => {
      try {
        const res = await fetch(`/api/guilds/${guildId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description }),
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
      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest text-faint">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-white focus:border-guild focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest text-faint">
          Purpose
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending || !name.trim()}
          className="rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
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
