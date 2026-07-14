"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Target, Clock, Plus } from "lucide-react"

import { ChamberHeader, Card, CardTitle } from "@/components/shared"
import type { Quest, QuestBoard as QuestBoardShape } from "@/lib/quests"

interface QuestBoardProps {
  guildId: string
  guildName: string
  initialBoard: QuestBoardShape
}

function QuestCard({ quest }: { quest: Quest }) {
  const dueDate = quest.dueAt ? new Date(quest.dueAt) : null
  const isOverdue = dueDate && dueDate < new Date() && !quest.completedAt

  return (
    <Card>
      <CardTitle>{quest.title}</CardTitle>
      {quest.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray">{quest.description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {dueDate && (
          <span
            className={`flex items-center gap-1 text-xs ${
              isOverdue ? "text-danger" : "text-gray"
            }`}
          >
            <Clock className="h-3 w-3" />
            {dueDate.toLocaleDateString("en-AU", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </Card>
  )
}

export function QuestBoard({ guildId, guildName, initialBoard }: QuestBoardProps) {
  const router = useRouter()
  const [board] = useState<QuestBoardShape>(initialBoard)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [targetStackId, setTargetStackId] = useState<string>(
    initialBoard.stacks[0]?.id ?? "",
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !targetStackId) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/stacks/${targetStackId}/quests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            dueAt: dueAt || null,
          }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `HTTP ${res.status}`)
        }
        setTitle("")
        setDescription("")
        setDueAt("")
        setShowForm(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create quest")
      }
    })
  }

  return (
    <div className="flex h-full flex-col p-6 lg:p-8">
      <ChamberHeader
        backHref={`/guild/${guildId}`}
        icon={<Target className="h-10 w-10 text-guild" />}
        title="Quests"
        subtitle={`Endeavors of ${guildName}`}
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80"
        >
          <Plus className="h-4 w-4" />
          Create Quest
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="mb-6 rounded-lg border border-gray-dark p-4"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Quest title…"
                  className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray">Stack</label>
                <select
                  value={targetStackId}
                  onChange={e => setTargetStackId(e.target.value)}
                  className="rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"
                >
                  {board.stacks.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray">Due</label>
                <input
                  type="date"
                  value={dueAt}
                  onChange={e => setDueAt(e.target.value)}
                  className="rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray">Description (optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-y rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!title.trim() || !targetStackId || pending}
                className="rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80 disabled:opacity-50"
              >
                {pending ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null) }}
                className="text-sm text-gray transition-colors hover:text-white"
              >
                Cancel
              </button>
              {error && <span className="text-sm text-danger">{error}</span>}
            </div>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full min-w-max gap-4">
          {board.stacks.map(stack => (
            <div
              key={stack.id}
              className="flex w-72 shrink-0 flex-col rounded-lg border border-gray-dark bg-black-deep/40 p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="font-display text-sm tracking-widest text-gold uppercase">
                  {stack.title}
                </h3>
                <span className="font-mono text-[10px] text-faint">
                  {stack.quests.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {stack.quests.length === 0 ? (
                  <p className="py-6 text-center text-xs italic text-faint">
                    Nothing here
                  </p>
                ) : (
                  stack.quests.map(q => <QuestCard key={q.id} quest={q} />)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
