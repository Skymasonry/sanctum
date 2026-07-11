"use client"

import { useState, useTransition } from "react"
import { X, Loader2 } from "lucide-react"

interface CreateGuildModalProps {
  onClose: () => void
}

export function CreateGuildModal({ onClose }: CreateGuildModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/guilds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), description: description.trim() }),
        })
        if (!res.ok) throw new Error(await res.text())
        onClose()
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-dark bg-black-deep shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-dark px-6 py-4">
          <h2 className="font-display text-lg font-medium text-gold">Seed a Guild</h2>
          <button onClick={onClose} className="text-gray transition-colors hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray">
              Guild Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name your circle..."
              className="w-full rounded-lg border border-gray-dark bg-black-light px-4 py-2.5 text-sm text-white placeholder:text-gray focus:border-gold/50 focus:outline-none"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray">
              Purpose
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What draws this guild together..."
              rows={3}
              className="w-full rounded-lg border border-gray-dark bg-black-light px-4 py-2.5 text-sm text-white placeholder:text-gray focus:border-gold/50 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-dark py-2.5 text-sm text-gray transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-guild py-2.5 text-sm font-medium text-black transition-colors hover:bg-guild/80 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Seed Guild
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
