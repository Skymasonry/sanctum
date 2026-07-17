"use client"

import Link from "next/link"
import { useState } from "react"

import type { StirringGuild } from "@/types/threshold"

interface StirringColumnProps {
  active: StirringGuild[]
  quiet: StirringGuild[]
}

export function StirringColumn({ active, quiet }: StirringColumnProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section>
      <div className="mb-3.5 flex items-baseline justify-between border-b border-white/[0.06] pb-3">
        <h2 className="font-display text-[13px] font-medium tracking-[0.2em] text-gold uppercase">
          Stirring
        </h2>
        <button
          type="button"
          className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase transition hover:text-gold"
        >
          Mark all seen
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {active.length === 0 && quiet.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {active.map(g => (
              <ActiveTile key={g.guildId} guild={g} />
            ))}
            {quiet.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setExpanded(v => !v)}
                  className="mt-1 flex w-full items-center justify-between px-1 py-3 font-mono text-[10px] tracking-[0.14em] text-faint uppercase transition hover:text-muted"
                >
                  <span>
                    {quiet.length === 1
                      ? "One guild is quiet"
                      : `${quiet.length} guilds are quiet`}
                  </span>
                  <span>{expanded ? "⌃" : "⌄"}</span>
                </button>
                {expanded && (
                  <div className="flex flex-col gap-0.5">
                    {quiet.map(g => (
                      <QuietRow key={g.guildId} guild={g} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function ActiveTile({ guild }: { guild: StirringGuild }) {
  const isLive = guild.presentNow > 0
  return (
    <Link
      href={`/guild/${guild.guildId}`}
      className={`flex items-center gap-3 rounded-lg border border-white/[0.055] px-4 py-3.5 transition hover:-translate-x-0 hover:translate-x-0.5 hover:border-gold/40 ${
        isLive ? "border-l-2 border-l-ember" : "border-l-2 border-l-gold/40"
      }`}
      style={{
        background: "linear-gradient(165deg, #171614, #111110)",
      }}
    >
      <span
        className={`w-[18px] flex-none text-center text-base opacity-85 ${
          isLive ? "text-ember" : "text-gold"
        }`}
      >
        {guild.glyph}
      </span>
      <span className="min-w-0 flex-1 truncate font-display text-base font-normal tracking-[0.03em]">
        {guild.name}
      </span>
      <span className="flex flex-none gap-1.5">
        {isLive && <Chip variant="now">● {guild.presentNow} here</Chip>}
        {guild.unreadMessages > 0 && (
          <Chip variant="words">✉ {guild.unreadMessages}</Chip>
        )}
        {guild.newFiles > 0 && (
          <Chip variant="files">▤ {guild.newFiles}</Chip>
        )}
        {guild.eventChanges > 0 && (
          <Chip variant="event">◷ {guild.eventChanges}</Chip>
        )}
      </span>
      <span className="w-7 flex-none text-right font-mono text-[9px] text-faint">
        {relativeTime(guild.lastActivity)}
      </span>
    </Link>
  )
}

function QuietRow({ guild }: { guild: StirringGuild }) {
  return (
    <Link
      href={`/guild/${guild.guildId}`}
      className="flex items-center gap-3 px-4 py-2 opacity-50 transition hover:opacity-85"
    >
      <span className="w-[18px] flex-none text-center text-sm text-gold">
        {guild.glyph}
      </span>
      <span className="flex-1 truncate text-base text-muted">{guild.name}</span>
      <span className="font-mono text-[9px] text-faint">
        {relativeTime(guild.lastActivity)}
      </span>
    </Link>
  )
}

type ChipVariant = "words" | "files" | "event" | "now"
function Chip({
  variant,
  children,
}: {
  variant: ChipVariant
  children: React.ReactNode
}) {
  const map: Record<ChipVariant, string> = {
    words: "border-gold/30 text-gold bg-gold/[0.06]",
    files: "border-[#8fb3d4]/25 text-[#8fb3d4] bg-[#7fa5c9]/5",
    event: "border-[#b39fd0]/25 text-[#b39fd0] bg-[#a98fc9]/5",
    now: "border-ember/40 text-ember bg-ember/[0.08]",
  }
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[10px] whitespace-nowrap ${map[variant]}`}
    >
      {children}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-white/5 py-8 text-center text-[15px] text-faint">
      <p className="font-display tracking-[0.05em]">All hearths are still.</p>
      <p className="mt-1 font-mono text-[10px] tracking-[0.14em] uppercase">
        Nothing to report
      </p>
    </div>
  )
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—"
  const diff = Date.now() - Date.parse(iso)
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "short" })
  }
  if (d < 28) return `${Math.floor(d / 7)}w`
  return `${Math.floor(d / 30)}mo`
}
