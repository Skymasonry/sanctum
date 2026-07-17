"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, ClipboardList, X } from "lucide-react"

import { Card, CardTitle } from "@/components/shared"

interface ScrollListItem {
  id: string
  guildId: string
  title: string
  description: string
  published: boolean
  questionCount: number
  submissionCount: number
  updatedAt: string
}

interface ScrollsViewProps {
  guildId: string
  initialScrolls: ScrollListItem[]
}

export function ScrollsView({ guildId, initialScrolls }: ScrollsViewProps) {
  const router = useRouter()
  const scrolls = initialScrolls
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    start(async () => {
      try {
        const res = await fetch(`/api/guilds/${guildId}/scrolls`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), description: description.trim() }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `HTTP ${res.status}`)
        }
        setTitle("")
        setDescription("")
        setShowForm(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create")
      }
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition hover:bg-guild/80"
        >
          <Plus className="h-4 w-4" />
          New Scroll
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-6 rounded-lg border border-gray-dark p-4">
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
                placeholder="Scroll title…"
                className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray">Description (optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full resize-y rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!title.trim() || pending}
                className="rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition hover:bg-guild/80 disabled:opacity-50"
              >
                {pending ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null) }}
                className="inline-flex items-center gap-1 text-sm text-gray hover:text-white"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
              {error && <span className="text-sm text-danger">{error}</span>}
            </div>
          </div>
        </form>
      )}

      {scrolls.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-dark/70 text-center">
          <div className="px-6 py-10">
            <ClipboardList className="mx-auto mb-3 h-8 w-8 text-gray" />
            <p className="font-display text-lg tracking-[0.03em] text-gray">No scrolls yet</p>
            <p className="mt-2 max-w-md text-sm text-faint">
              Create the first one.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {scrolls.map(s => (
            <Link key={s.id} href={`/guild/${guildId}/scrolls/${s.id}`} className="block">
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate">{s.title}</CardTitle>
                    {s.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray">{s.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 font-mono text-[10px] text-faint">
                      <span>{s.questionCount} question{s.questionCount === 1 ? "" : "s"}</span>
                      <span>{s.submissionCount} response{s.submissionCount === 1 ? "" : "s"}</span>
                      {!s.published && (
                        <span className="rounded bg-gray-dark px-1.5 py-0.5 uppercase">Draft</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
