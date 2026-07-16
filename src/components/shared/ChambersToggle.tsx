"use client"

import { CHAMBER_DEFS } from "@/lib/chambers"
import type { ChamberId } from "@/types/guild"

interface ChambersToggleProps {
  value: Set<ChamberId>
  onToggle: (id: ChamberId) => void
}

/**
 * Grid of chamber toggle buttons. Used in the seeder form and in
 * guild settings. Purely controlled — the parent owns the Set of
 * enabled chamber ids.
 */
export function ChambersToggle({ value, onToggle }: ChambersToggleProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {CHAMBER_DEFS.map(c => {
        const on = value.has(c.id)
        return (
          <button
            type="button"
            key={c.id}
            onClick={() => onToggle(c.id)}
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
  )
}
