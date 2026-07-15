"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

const ADMISSION_OPTIONS = [
  { value: "open", label: "Open — anyone can join" },
  { value: "closed", label: "Closed — application required" },
  { value: "mandatory", label: "Mandatory — everyone auto-joins" },
] as const

const EMOJI_PRESETS = ["⚔️", "🛡️", "🌲", "🌊", "🔥", "⭐", "🌙", "☀️", "🗝️", "🔮", "📜", "🕯️"]
const COLOR_PRESETS = ["#f5c05c", "#5cbaf5", "#5cf5b9", "#f55c9c", "#c9f55c", "#f5a05c", "#9c5cf5", "#5cf5f5"]

export function GuildBuilder() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [icon, setIcon] = useState(EMOJI_PRESETS[0])
  const [color, setColor] = useState(COLOR_PRESETS[0])
  const [admission, setAdmission] = useState<"open" | "closed" | "mandatory">("open")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    start(async () => {
      try {
        const res = await fetch(`/api/guilds/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            icon,
            color,
            admission,
          }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `HTTP ${res.status}`)
        }
        const data = (await res.json()) as { guild: { id: string } }
        router.push(`/guild/${data.guild.id}`)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create guild")
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest text-faint">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. The Watchtower"
          autoFocus
          className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2.5 text-white placeholder-gray focus:border-guild focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest text-faint">Purpose</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="A short line about what this guild is for"
          className="w-full resize-y rounded-lg border border-gray-dark bg-black-deep px-3 py-2.5 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-widest text-faint">Icon</label>
        <div className="flex flex-wrap gap-2">
          {EMOJI_PRESETS.map(e => (
            <button
              type="button"
              key={e}
              onClick={() => setIcon(e)}
              className={
                "flex h-11 w-11 items-center justify-center rounded-lg border text-2xl transition-colors " +
                (icon === e
                  ? "border-guild bg-guild/15"
                  : "border-gray-dark bg-black-light hover:border-guild/40")
              }
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-widest text-faint">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map(c => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={
                "h-9 w-9 rounded-full border-2 transition-transform " +
                (color === c ? "border-white scale-110" : "border-transparent hover:scale-105")
              }
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-widest text-faint">Admission</label>
        <div className="flex flex-col gap-2">
          {ADMISSION_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors " +
                (admission === opt.value
                  ? "border-guild bg-guild/10 text-white"
                  : "border-gray-dark bg-black-deep text-gray-light hover:border-guild/40")
              }
            >
              <input
                type="radio"
                name="admission"
                value={opt.value}
                checked={admission === opt.value}
                onChange={() => setAdmission(opt.value)}
                className="accent-guild"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={!name.trim() || pending}
          className="rounded-lg bg-guild px-5 py-2.5 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80 disabled:opacity-50"
        >
          {pending ? "Seeding…" : "Seed guild"}
        </button>
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </form>
  )
}
