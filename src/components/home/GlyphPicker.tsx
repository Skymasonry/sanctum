"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"

interface GlyphPickerProps {
  value: string
  onChange: (glyph: string) => void
}

/**
 * Accept a raw single character, or a codepoint written as any of:
 *   ✶      → itself
 *   2726   → hex (leading zeros optional)
 *   U+2726 → hex with U+ prefix
 *   0x2726 → hex with 0x prefix
 *   \u2726 → escaped-hex
 * Returns the resolved character or null if the input can't be parsed
 * into a single valid codepoint.
 */
function parseGlyphInput(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  // Already a single grapheme (Unicode-aware)
  if ([...s].length === 1) return s
  const hexMatch = s.match(/^(?:u\+|0x|\\u\{?)?([0-9a-f]{1,6})\}?$/i)
  if (hexMatch) {
    try {
      return String.fromCodePoint(parseInt(hexMatch[1], 16))
    } catch {
      return null
    }
  }
  return null
}

/**
 * Curated Unicode glyph sets in the same aesthetic as the original
 * hand-picked guild icons. Rendered by the system font, so they come
 * out bold and legible at any size — no artwork to design.
 */
const GLYPH_GROUPS: { label: string; glyphs: string[] }[] = [
  {
    label: "Stars & Sparkles",
    glyphs: ["✦", "✧", "✩", "✪", "✫", "✬", "✭", "✮", "✯", "✰", "✱", "✶", "✷", "✸", "✹", "✺", "★", "☆"],
  },
  {
    label: "Celestial",
    glyphs: ["☀", "☼", "☾", "☽", "☉", "⊙", "☄", "✵", "✴", "◐", "◑", "◒", "◓"],
  },
  {
    label: "Geometric",
    glyphs: ["⬡", "⬢", "⬣", "◆", "◇", "◈", "▲", "△", "▼", "▽", "●", "○", "◉", "◎", "⊕", "⊗", "⌬"],
  },
  {
    label: "Runes",
    glyphs: ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᛁ", "ᛃ", "ᛈ", "ᛉ", "ᛊ", "ᛏ", "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛞ", "ᛟ"],
  },
  {
    label: "Symbols",
    glyphs: ["⚚", "⚛", "⚜", "☯", "☸", "⚙", "⁜", "⚝", "✤", "✥", "❋", "❉", "❊", "❈", "☩", "♁", "∞", "∅", "⋆"],
  },
]

export function GlyphPicker({ value, onChange }: GlyphPickerProps) {
  const [customInput, setCustomInput] = useState("")
  const [customError, setCustomError] = useState<string | null>(null)

  const submitCustom = () => {
    const parsed = parseGlyphInput(customInput)
    if (!parsed) {
      setCustomError("Enter a single character or a hex codepoint (e.g. 2726).")
      return
    }
    setCustomError(null)
    onChange(parsed)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 text-[10px] uppercase tracking-widest text-faint">Custom</div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customInput}
            onChange={e => {
              setCustomInput(e.target.value)
              setCustomError(null)
            }}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); submitCustom() }
            }}
            placeholder="Paste a glyph or type a codepoint (e.g. 2726, U+2726, ✶)"
            className="min-w-0 flex-1 rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
          />
          <button
            type="button"
            onClick={submitCustom}
            className="rounded-lg bg-guild px-3 py-2 text-sm font-medium text-black-deep hover:bg-guild/80"
          >
            Use
          </button>
        </div>
        {customError && <p className="mt-1 text-xs text-danger">{customError}</p>}
        <a
          href="https://symbl.cc/en/unicode-table/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-gray hover:text-guild"
        >
          Browse the full Unicode set
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {GLYPH_GROUPS.map(group => (
        <div key={group.label}>
          <div className="mb-1.5 text-[10px] uppercase tracking-widest text-faint">
            {group.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.glyphs.map(g => (
              <button
                type="button"
                key={g}
                onClick={() => onChange(g)}
                className={
                  "flex h-10 w-10 items-center justify-center rounded-lg border text-xl transition-colors " +
                  (value === g
                    ? "border-guild bg-guild/15 text-white"
                    : "border-gray-dark bg-black-deep text-gray-light hover:border-guild/40 hover:text-white")
                }
                title={g}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
