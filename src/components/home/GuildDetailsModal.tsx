"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

import type { Guild } from "@/types/guild"

interface GuildDetailsModalProps {
  guild: Guild
  onClose: () => void
  onAction?: (action: "join" | "apply") => void
  acting?: boolean
  actionResult?: string | null
  isPending?: boolean
}

export function GuildDetailsModal({
  guild,
  onClose,
  onAction,
  acting,
  actionResult,
  isPending,
}: GuildDetailsModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const color = guild.color || "#c9a227"
  const canJoin = guild.admission === "open"
  const label = canJoin ? "Join" : "Apply"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black-deep/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-gray-dark bg-black shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-gray transition hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-gray-dark px-6 py-6 text-center">
          <div className="mb-3 text-5xl drop-shadow-lg" style={{ color }}>
            {guild.icon?.startsWith("data:") ? (
              <img src={guild.icon} alt="" className="mx-auto h-12 w-12 object-contain" />
            ) : (
              guild.icon || "⬡"
            )}
          </div>
          <h2 className="font-display text-2xl tracking-wide" style={{ color }}>
            {guild.name}
          </h2>
          <p className="mt-1 font-mono text-[10px] tracking-[0.15em] text-faint uppercase">
            {guild.memberCount} member{guild.memberCount === 1 ? "" : "s"} · {guild.admission}
          </p>
        </div>

        <div className="space-y-4 px-6 py-5 text-[15px] text-muted">
          {guild.description && <p>{guild.description}</p>}
          {guild.patternIntegrity && (
            <Section title="Pattern integrity" body={guild.patternIntegrity} />
          )}
          {guild.evolutionaryPurpose && (
            <Section title="Evolutionary purpose" body={guild.evolutionaryPurpose} />
          )}
        </div>

        <div className="border-t border-gray-dark px-6 py-4">
          {actionResult ? (
            <div className="text-center text-sm text-success">{actionResult}</div>
          ) : isPending ? (
            <div className="text-center text-sm italic text-gold-dim">Application pending</div>
          ) : (
            <button
              type="button"
              onClick={() => onAction?.(canJoin ? "join" : "apply")}
              disabled={acting || !onAction}
              className="w-full rounded-md px-4 py-2 font-mono text-xs font-medium tracking-[0.14em] text-black uppercase transition hover:brightness-110 disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {acting ? "…" : label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
        {title}
      </div>
      <p className="text-[15px] text-muted">{body}</p>
    </div>
  )
}
