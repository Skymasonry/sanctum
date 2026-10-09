"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Target, Clock, Plus, Check, MoveRight, Trash2, MoreVertical } from "lucide-react"

import { ChamberHeader, Card, CardTitle } from "@/components/shared"
import type { Quest, QuestBoard as QuestBoardShape, QuestStack } from "@/lib/quests"

interface QuestBoardProps {
  guildId: string
  guildName: string
  initialBoard: QuestBoardShape
}

function QuestCard({
  quest,
  stackId,
  allStacks,
  onChange,
}: {
  quest: Quest
  stackId: string
  allStacks: QuestStack[]
  onChange: () => void
}) {
  const dueDate = quest.dueAt ? new Date(quest.dueAt) : null
  const isOverdue = dueDate && dueDate < new Date() && !quest.completedAt
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function patch(body: Record<string, unknown>) {
    setPending(true)
    try {
      await fetch(`/api/quests/${quest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      onChange()
    } finally {
      setPending(false)
      setOpen(false)
    }
  }

  async function remove() {
    setPending(true)
    try {
      await fetch(`/api/quests/${quest.id}`, { method: "DELETE" })
      onChange()
    } finally {
      setPending(false)
      setOpen(false)
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <CardTitle className={quest.completedAt ? "line-through decoration-gray/50" : ""}>
            {quest.title}
          </CardTitle>
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
            {quest.completedAt && (
              <span className="text-xs text-success">✓ complete</span>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            disabled={pending}
            className="flex h-7 w-7 items-center justify-center rounded text-gray hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {open && (
            <div className="absolute right-0 top-8 z-10 min-w-[180px] rounded-lg border border-gray-dark bg-black-light py-1 shadow-xl">
              <button
                type="button"
                onClick={() => patch({ completedAt: quest.completedAt ? null : new Date().toISOString() })}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-light hover:bg-white/5 hover:text-success"
              >
                <Check className="h-3.5 w-3.5" />
                {quest.completedAt ? "Mark incomplete" : "Mark complete"}
              </button>
              <div className="my-1 h-px bg-gray-dark" />
              <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-faint">Move to</div>
              {allStacks
                .filter(s => s.id !== stackId)
                .map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => patch({ stackId: s.id, position: (s.quests.length ?? 0) })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-light hover:bg-white/5 hover:text-guild"
                  >
                    <MoveRight className="h-3.5 w-3.5" />
                    {s.title}
                  </button>
                ))}
              <div className="my-1 h-px bg-gray-dark" />
              <button
                type="button"
                onClick={remove}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-light hover:bg-white/5 hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function QuestBoard({ guildId, guildName, initialBoard }: QuestBoardProps) {
  const router = useRouter()
  // Use the prop directly — server component provides fresh data on refresh().
  // useState(initialX) captures once and never updates.
  const board = initialBoard
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
    <div className="flex h-full flex-col overflow-hidden p-6 lg:p-8">
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
                  stack.quests.map(q => (
                    <QuestCard
                      key={q.id}
                      quest={q}
                      stackId={stack.id}
                      allStacks={board.stacks}
                      onChange={() => router.refresh()}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
