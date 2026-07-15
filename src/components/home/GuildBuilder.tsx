"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, X } from "lucide-react"

const ADMISSION_OPTIONS = [
  { value: "open", label: "Open — anyone can join" },
  { value: "closed", label: "Closed — application required" },
  { value: "mandatory", label: "Mandatory — everyone auto-joins" },
] as const

const COLOR_PRESETS = [
  "#f5c05c", "#5cbaf5", "#5cf5b9", "#f55c9c", "#c9f55c",
  "#f5a05c", "#9c5cf5", "#5cf5f5", "#d4623a", "#e0d19a",
]

const ICON_SIZE = 512 // square canvas size uploaded to S3

/**
 * Load the picked file, cover-crop into a square and return as a Blob
 * plus a base64 preview URL. Client-side so the server doesn't need
 * an image processing dep.
 */
async function prepareIcon(file: File): Promise<{ blob: Blob; previewUrl: string }> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = ICON_SIZE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas unavailable")

  // Cover-fit: fill the whole square, cropping longer axis.
  const scale = Math.max(ICON_SIZE / bitmap.width, ICON_SIZE / bitmap.height)
  const dw = bitmap.width * scale
  const dh = bitmap.height * scale
  ctx.drawImage(bitmap, (ICON_SIZE - dw) / 2, (ICON_SIZE - dh) / 2, dw, dh)

  const blob = await new Promise<Blob | null>(res =>
    canvas.toBlob(res, "image/png", 0.92),
  )
  if (!blob) throw new Error("encode failed")

  return { blob, previewUrl: canvas.toDataURL("image/png") }
}

export function GuildBuilder() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [iconBlob, setIconBlob] = useState<Blob | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [color, setColor] = useState(COLOR_PRESETS[0])
  const [admission, setAdmission] = useState<"open" | "closed" | "mandatory">("open")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    try {
      const { blob, previewUrl } = await prepareIcon(file)
      setIconBlob(blob)
      setIconPreview(previewUrl)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Icon prep failed")
    }
  }

  const clearIcon = () => {
    setIconBlob(null)
    setIconPreview(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    start(async () => {
      try {
        let iconUrl: string | null = null
        if (iconBlob) {
          const fd = new FormData()
          fd.append("file", iconBlob, "icon.png")
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
        <label className="mb-2 block text-xs uppercase tracking-widest text-faint">
          Emblem
        </label>
        <div className="flex items-center gap-4">
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-dark bg-black-deep"
            style={{ boxShadow: `inset 0 0 0 2px ${color}30` }}
          >
            {iconPreview ? (
              <img src={iconPreview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-8 w-8 text-gray" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-gray-dark bg-black-light px-3 py-2 text-sm text-white transition-colors hover:border-guild/50 hover:bg-guild/10"
            >
              {iconPreview ? "Replace image…" : "Upload emblem…"}
            </button>
            {iconPreview && (
              <button
                type="button"
                onClick={clearIcon}
                className="inline-flex items-center gap-1 text-xs text-gray hover:text-danger"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            )}
            <p className="max-w-xs text-xs text-faint">
              PNG, JPG, WEBP or SVG. Cover-cropped to a square at {ICON_SIZE}×{ICON_SIZE}.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={onPickFile}
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
