"use client"

import { useState } from "react"
import { ChamberHeader, EmptyState, Card, CardTitle } from "@/components/shared"
import { Target, Clock, MessageCircle, Plus } from "lucide-react"
import type { DeckStack, DeckCard } from "@/lib/deck"

interface QuestBoardProps {
  guildId: string
  guildName: string
  boardId?: number
  initialStacks: DeckStack[]
}

function QuestCard({ card }: { card: DeckCard }) {
  const dueDate = card.duedate ? new Date(card.duedate) : null
  const isOverdue = dueDate && dueDate < new Date()

  return (
    <Card>
      <CardTitle>{card.title}</CardTitle>
      {card.description && (
        <p className="mt-2 text-sm text-gray line-clamp-2">{card.description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {dueDate && (
          <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-danger" : "text-gray"}`}>
            <Clock className="h-3 w-3" />
            {dueDate.toLocaleDateString("en-AU", { month: "short", day: "numeric" })}
          </span>
        )}
        {card.assignedUsers.length > 0 && (
          <div className="flex items-center gap-1">
            {card.assignedUsers.slice(0, 3).map(assignee => (
              <img
                key={assignee}
                src={`/api/avatar/${assignee}/20`}
                alt={assignee}
                title={assignee}
                className="h-5 w-5 rounded-full"
              />
            ))}
            {card.assignedUsers.length > 3 && (
              <span className="text-xs text-gray">+{card.assignedUsers.length - 3}</span>
            )}
          </div>
        )}
        {card.commentsCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray">
            <MessageCircle className="h-3 w-3" />
            {card.commentsCount}
          </span>
        )}
        {card.labels.map(label => (
          <span
            key={label.id}
            className="rounded px-2 py-0.5 text-xs"
            style={{ backgroundColor: `#${label.color}30`, color: `#${label.color}` }}
          >
            {label.title}
          </span>
        ))}
      </div>
    </Card>
  )
}

function StackColumn({ stack }: { stack: DeckStack }) {
  return (
    <div className="w-72 flex-shrink-0">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-sm font-semibold tracking-wide text-guild">{stack.title}</h2>
        <span className="rounded bg-guild/20 px-2 py-0.5 text-xs text-guild">
          {stack.cards.length}
        </span>
      </div>
      <div className="space-y-3">
        {stack.cards.map(card => (
          <QuestCard key={card.id} card={card} />
        ))}
        {stack.cards.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-dark p-4 text-center text-sm text-gray">
            No quests in this stage
          </div>
        )}
      </div>
    </div>
  )
}

export function QuestBoard({ guildId, guildName, boardId, initialStacks }: QuestBoardProps) {
  const [stacks, setStacks] = useState<DeckStack[]>(initialStacks)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedStackId, setSelectedStackId] = useState<number | "">(stacks.length > 0 ? stacks[0].id : "")
  const [submitting, setSubmitting] = useState(false)

  async function refreshStacks() {
    if (!boardId) return
    try {
      const res = await fetch(`/api/deck/${boardId}/stacks`)
      if (res.ok) {
        const data = await res.json()
        setStacks(data.stacks || [])
      }
    } catch (error) {
      console.error("Failed to refresh stacks:", error)
    }
  }

  async function handleCreateQuest(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !selectedStackId || !boardId) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/deck/${boardId}/stacks/${selectedStackId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      })

      if (res.ok) {
        setTitle("")
        setDescription("")
        setShowForm(false)
        await refreshStacks()
      }
    } catch (error) {
      console.error("Failed to create quest:", error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col p-6 lg:p-8">
      <ChamberHeader
        backHref={`/guild/${guildId}`}
        icon={<Target className="h-10 w-10 text-guild" />}
        title="Quests"
        subtitle={`Active endeavors of ${guildName}`}
      />

      {boardId && (
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80"
          >
            <Plus className="h-4 w-4" />
            Create Quest
          </button>
        </div>
      )}

      {showForm && boardId && (
        <form onSubmit={handleCreateQuest} className="mb-6 rounded-lg border border-gray-dark p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Quest title..."
                className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description..."
                className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="mb-1 block text-xs text-gray">Stack</label>
              <select
                value={selectedStackId}
                onChange={e => setSelectedStackId(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"
              >
                {stacks.map(stack => (
                  <option key={stack.id} value={stack.id}>{stack.title}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Submit"}
            </button>
          </div>
        </form>
      )}

      <div className="flex-1">
        {!boardId ? (
          <EmptyState message="No quest board has been set up for this guild yet." />
        ) : stacks.length === 0 ? (
          <EmptyState message="The quest board is empty." />
        ) : (
          <div className="custom-scrollbar flex gap-4 overflow-x-auto pb-4">
            {stacks.map(stack => (
              <StackColumn key={stack.id} stack={stack} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
