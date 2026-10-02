"use client"

import { useState } from "react"
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react"

import type { ContentBlock, ContentBlockType } from "@/lib/scrolls"

interface ContentBlocksEditorProps {
  scrollId: string
  initialBlocks: ContentBlock[]
  onSaved: () => void
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b${Date.now()}${Math.random().toString(36).slice(2)}`
}

/**
 * Seeder-only editor for a scroll's structured page content — an
 * ordered list of heading/body blocks, saved as one PATCH. Rendered
 * read-only via ContentBlocksView on both the in-app and public pages.
 */
export function ContentBlocksEditor({ scrollId, initialBlocks, onSaved }: ContentBlocksEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const update = (id: string, patch: Partial<ContentBlock>) =>
    setBlocks(bs => bs.map(b => (b.id === id ? { ...b, ...patch } : b)))

  const remove = (id: string) => setBlocks(bs => bs.filter(b => b.id !== id))

  const move = (id: string, dir: -1 | 1) =>
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= bs.length) return bs
      const next = [...bs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const add = (type: ContentBlockType) => setBlocks(bs => [...bs, { id: newId(), type, text: "" }])

  const save = async () => {
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/scrolls/${scrollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentBlocks: blocks }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSaved(true)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => (
        <div key={b.id} className="flex items-start gap-2 rounded-lg border border-gray-dark bg-black-deep/40 p-3">
          <div className="flex flex-col gap-1 pt-1">
            <button
              type="button"
              onClick={() => move(b.id, -1)}
              disabled={i === 0}
              className="text-faint hover:text-guild disabled:opacity-30"
              aria-label="Move up"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => move(b.id, 1)}
              disabled={i === blocks.length - 1}
              className="text-faint hover:text-guild disabled:opacity-30"
              aria-label="Move down"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <select
              value={b.type}
              onChange={e => update(b.id, { type: e.target.value as ContentBlockType })}
              className="mb-1.5 rounded border border-gray-dark bg-black-deep px-2 py-1 text-xs text-white focus:border-guild focus:outline-none"
            >
              <option value="heading">Heading</option>
              <option value="body">Body text</option>
            </select>
            {b.type === "heading" ? (
              <input
                type="text"
                value={b.text}
                onChange={e => update(b.id, { text: e.target.value })}
                placeholder="Heading…"
                className="w-full rounded border border-gray-dark bg-black-deep px-2 py-1.5 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
              />
            ) : (
              <textarea
                value={b.text}
                onChange={e => update(b.id, { text: e.target.value })}
                placeholder="Body text…"
                rows={3}
                className="w-full resize-y rounded border border-gray-dark bg-black-deep px-2 py-1.5 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => remove(b.id)}
            className="mt-1 rounded p-1 text-gray transition hover:bg-black-light hover:text-danger"
            aria-label="Remove block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => add("heading")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-dark px-3 py-1.5 text-xs text-gray-light transition hover:border-guild/50 hover:bg-guild/10"
        >
          <Plus className="h-3.5 w-3.5" /> Add heading
        </button>
        <button
          type="button"
          onClick={() => add("body")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-dark px-3 py-1.5 text-xs text-gray-light transition hover:border-guild/50 hover:bg-guild/10"
        >
          <Plus className="h-3.5 w-3.5" /> Add body text
        </button>
      </div>

      <div className="flex items-center gap-3 border-t border-gray-dark pt-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition hover:bg-guild/80 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save page content"}
        </button>
        {saved && <span className="text-sm text-success">Saved</span>}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </div>
  )
}
