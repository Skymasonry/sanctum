"use client"

import { useEffect, useRef, useState } from "react"
import { HelpCircle } from "lucide-react"

interface HelpTooltipProps {
  label: string
  children: React.ReactNode
}

/**
 * Small "?" icon that reveals a definition popover on click. Used next
 * to guild-ethos fields (Evolutionary Purpose, Pattern Integrity, …)
 * so members don't need to already know Sky Masons' vocabulary to
 * fill them in.
 */
export function HelpTooltip({ label, children }: HelpTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={`What is ${label}?`}
        className="text-faint transition-colors hover:text-guild"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-lg border border-gray-dark bg-black-deep p-3 text-xs leading-relaxed text-gray-light shadow-xl"
        >
          <p className="mb-1 font-display text-[0.7rem] uppercase tracking-widest text-guild">
            {label}
          </p>
          {children}
        </div>
      )}
    </div>
  )
}
