"use client"

import { useState, useRef, useEffect } from "react"
import { Pencil, Check, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface GuildRenameEditorProps {
  guildId: string
  name: string
}

export function GuildRenameEditor({ guildId, name }: GuildRenameEditorProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  async function handleSave() {
    const trimmed = value.trim()
    if (!trimmed || trimmed === name) { setEditing(false); setValue(name); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/guilds/${guildId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
      setEditing(false)
    } catch {
      setError("Rename failed")
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setValue(name)
    setEditing(false)
    setError(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") handleCancel()
  }

  if (editing) {
    return (
      <div className="mt-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className="rounded border border-guild/40 bg-black/40 px-3 py-1 font-display text-lg tracking-wide text-white focus:border-guild focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-guild hover:text-guild-light disabled:opacity-50"
            aria-label="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="text-gray hover:text-white disabled:opacity-50"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="mt-2 inline-flex items-center gap-1 text-xs text-gray transition-colors hover:text-guild"
    >
      <Pencil className="h-3 w-3" />
      Rename guild
    </button>
  )
}
