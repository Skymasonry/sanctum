"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Archive,
  Calendar,
  FileText,
  MessageCircle,
  Target,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react"

import { sanitizeSvg } from "@/lib/svg-sanitize"
import type { ChamberId } from "@/types/guild"

const CHAMBER_DEFS: { id: ChamberId; icon: typeof Archive; name: string; note: string }[] = [
  { id: "pulse", icon: MessageCircle, name: "Chat", note: "Whispers between members" },
  { id: "chamber", icon: Video, name: "Chamber", note: "Live meeting hall" },
  { id: "rites", icon: Calendar, name: "Rites", note: "Shared calendar" },
  { id: "quests", icon: Target, name: "Quests", note: "Kanban of tasks" },
  { id: "scrolls", icon: FileText, name: "Scrolls", note: "Surveys & forms" },
  { id: "archive", icon: Archive, name: "Archive", note: "Files + live docs" },
  { id: "brotherhood", icon: Users, name: "Brothers", note: "Member roster" },
]

const DEFAULT_CHAMBERS: ChamberId[] = CHAMBER_DEFS.map(c => c.id)

const ADMISSION_OPTIONS = [
  { value: "open", label: "Open — anyone can join" },
  { value: "closed", label: "Closed — application required" },
  { value: "mandatory", label: "Mandatory — everyone auto-joins" },
] as const

const COLOR_PRESETS = [
  "#f5c05c", "#5cbaf5", "#5cf5b9", "#f55c9c", "#c9f55c",
  "#f5a05c", "#9c5cf5", "#5cf5f5", "#d4623a", "#e0d19a",
]

export function GuildBuilder() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(COLOR_PRESETS[0])
  const [admission, setAdmission] = useState<"open" | "closed" | "mandatory">("open")
  const [chambers, setChambers] = useState<Set<ChamberId>>(new Set(DEFAULT_CHAMBERS))

  const toggleChamber = (id: ChamberId) => {
    setChambers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [uploadedSvg, setUploadedSvg] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)

  const onPickSvg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (file.type !== "image/svg+xml" && !file.name.toLowerCase().endsWith(".svg")) {
      setError("Only SVG files are supported.")
      return
    }
    try {
      const text = await file.text()
      const clean = sanitizeSvg(text)
      if (!clean) {
        setError("That file is empty.")
        return
      }
      setUploadedSvg(clean)
      setUploadPreview(`data:image/svg+xml;utf8,${encodeURIComponent(clean)}`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read SVG")
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    start(async () => {
      try {
        let iconUrl: string | null = null
        if (uploadedSvg) {
          const blob = new Blob([uploadedSvg], { type: "image/svg+xml" })
          const fd = new FormData()
          fd.append("file", blob, "emblem.svg")
          const upRes = await fetch("/api/guild-icons", { method: "POST", body: fd })
          if (!upRes.ok) {
            const err = (await upRes.json().catch(() => null)) as { error?: string } | null
            throw new Error(err?.error || `Icon upload failed: HTTP ${upRes.status}`)
          }
          const upData = (await upRes.json()) as { url: string }
          iconUrl = upData.url
        }

        const res = await fetch(`/api/guilds/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            icon: iconUrl ?? "⬡",
            color,
            admission,
            chambers: Array.from(chambers),
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
        <label className="mb-2 block text-xs uppercase tracking-widest text-faint">Emblem</label>
        <div className="flex items-center gap-4">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-dark bg-black-deep">
            {uploadPreview ? (
              <img src={uploadPreview} alt="preview" className="h-full w-full object-contain" />
            ) : (
              <Upload className="h-8 w-8 text-gray" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-gray-dark bg-black-light px-3 py-2 text-sm text-white transition-colors hover:border-guild/50 hover:bg-guild/10"
            >
              {uploadPreview ? "Replace SVG…" : "Choose SVG file…"}
            </button>
            {uploadPreview && (
              <button
                type="button"
                onClick={() => {
                  setUploadedSvg(null)
                  setUploadPreview(null)
                }}
                className="inline-flex items-center gap-1 text-xs text-gray hover:text-danger"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            )}
            <p className="max-w-xs text-xs text-faint">
              SVG only. Scripts and event handlers are stripped on upload.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/svg+xml,.svg"
            onChange={onPickSvg}
            className="hidden"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-widest text-faint">Color</label>
        <div className="flex flex-wrap items-center gap-2">
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
          <label className="ml-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-dark bg-black-light px-3 py-1.5 text-xs text-gray-light hover:border-guild/50">
            <span
              className="h-4 w-4 rounded-full border border-gray-dark"
              style={{ backgroundColor: color }}
            />
            Custom
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="h-0 w-0 opacity-0"
            />
          </label>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-widest text-faint">
          Chambers to include
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CHAMBER_DEFS.map(c => {
            const on = chambers.has(c.id)
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleChamber(c.id)}
                className={
                  "flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors " +
                  (on
                    ? "border-guild bg-guild/10"
                    : "border-gray-dark bg-black-deep opacity-60 hover:opacity-100")
                }
              >
                <c.icon className={"h-4 w-4 shrink-0 " + (on ? "text-guild" : "text-gray")} />
                <div className="min-w-0 flex-1">
                  <p className={"text-sm " + (on ? "text-white" : "text-gray-light")}>{c.name}</p>
                  <p className="truncate text-xs text-faint">{c.note}</p>
                </div>
                <span
                  className={
                    "h-4 w-4 shrink-0 rounded border-2 " +
                    (on ? "border-guild bg-guild" : "border-gray-dark bg-transparent")
                  }
                  aria-hidden
                >
                  {on && (
                    <svg viewBox="0 0 16 16" className="h-full w-full text-black-deep">
                      <path
                        d="M3 8.5l3 3 7-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-faint">
          You can change this later from the guild&apos;s settings.
        </p>
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
