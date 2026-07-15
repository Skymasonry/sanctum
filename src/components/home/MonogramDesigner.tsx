"use client"

import { useEffect } from "react"

import { makeMonogramSvg, type MonogramShape } from "./monogram"

interface MonogramDesignerProps {
  initials: string
  onInitialsChange: (v: string) => void
  shape: MonogramShape
  onShapeChange: (s: MonogramShape) => void
  background: string
  foreground: string
  onForegroundChange: (c: string) => void
  /** Called with the generated SVG string whenever the config changes. */
  onSvgChange: (svg: string) => void
}

const SHAPES: { value: MonogramShape; label: string }[] = [
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "shield", label: "Shield" },
  { value: "hexagon", label: "Hexagon" },
]

export function MonogramDesigner({
  initials,
  onInitialsChange,
  shape,
  onShapeChange,
  background,
  foreground,
  onForegroundChange,
  onSvgChange,
}: MonogramDesignerProps) {
  const svg = makeMonogramSvg({ initials, shape, background, foreground })

  useEffect(() => {
    onSvgChange(svg)
  }, [svg, onSvgChange])

  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs uppercase tracking-widest text-faint">
          Initials
        </label>
        <input
          type="text"
          value={initials}
          onChange={e => onInitialsChange(e.target.value.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3))}
          maxLength={3}
          placeholder="e.g. SP"
          className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-white placeholder-gray focus:border-guild focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-widest text-faint">Shape</label>
        <div className="flex flex-wrap gap-2">
          {SHAPES.map(s => (
            <button
              type="button"
              key={s.value}
              onClick={() => onShapeChange(s.value)}
              className={
                "rounded-lg border px-3 py-2 text-sm transition-colors " +
                (shape === s.value
                  ? "border-guild bg-guild/15 text-white"
                  : "border-gray-dark bg-black-light text-gray-light hover:border-guild/40")
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-widest text-faint">
          Letter color
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onForegroundChange("#ffffff")}
            className={
              "flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition-colors " +
              (foreground.toLowerCase() === "#ffffff"
                ? "border-guild bg-guild/10 text-white"
                : "border-gray-dark bg-black-light text-gray-light hover:border-guild/40")
            }
          >
            <span className="h-3 w-3 rounded-full bg-white" />
            White
          </button>
          <button
            type="button"
            onClick={() => onForegroundChange("#000000")}
            className={
              "flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition-colors " +
              (foreground.toLowerCase() === "#000000"
                ? "border-guild bg-guild/10 text-white"
                : "border-gray-dark bg-black-light text-gray-light hover:border-guild/40")
            }
          >
            <span className="h-3 w-3 rounded-full bg-black" />
            Black
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-dark bg-black-light px-3 py-1.5 text-xs text-gray-light hover:border-guild/50">
            <span
              className="h-3 w-3 rounded-full border border-gray-dark"
              style={{ backgroundColor: foreground }}
            />
            Custom
            <input
              type="color"
              value={foreground}
              onChange={e => onForegroundChange(e.target.value)}
              className="h-0 w-0 opacity-0"
            />
          </label>
        </div>
      </div>

      {/* Preview */}
      <div className="flex justify-center pt-2">
        <img src={dataUrl} alt="preview" className="h-32 w-32" />
      </div>
    </div>
  )
}
