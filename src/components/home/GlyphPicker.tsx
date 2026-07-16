"use client"

interface GlyphPickerProps {
  value: string
  onChange: (glyph: string) => void
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
  return (
    <div className="flex flex-col gap-4">
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
