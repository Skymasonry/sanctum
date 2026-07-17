"use client"

import Link from "next/link"

import type { Gathering } from "@/types/threshold"

interface GatheringsColumnProps {
  gatherings: Gathering[]
}

export function GatheringsColumn({ gatherings }: GatheringsColumnProps) {
  // Group by month (uses locale month name)
  const groups = groupByMonth(gatherings)
  return (
    <section>
      <div className="mb-3.5 flex items-baseline justify-between border-b border-white/[0.06] pb-3">
        <h2 className="font-display text-[13px] font-medium tracking-[0.2em] text-gold uppercase">
          Gatherings
        </h2>
        <Link
          href="/rites"
          className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase transition hover:text-gold"
        >
          Full calendar →
        </Link>
      </div>

      {gatherings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/5 py-8 text-center text-[15px] text-faint">
          <p className="font-display tracking-[0.05em]">No gatherings yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map(({ label, items }, gi) => (
            <div key={label} className="flex flex-col gap-2">
              {gi > 0 && (
                <div className="mt-3.5 mb-2 font-mono text-[9px] tracking-[0.22em] text-faint uppercase">
                  {label}
                </div>
              )}
              {items.map((ev, i) => (
                <EventCard key={ev.id} event={ev} isNext={gi === 0 && i === 0} />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function EventCard({ event, isNext }: { event: Gathering; isNext: boolean }) {
  const d = new Date(event.startsAt)
  const dow = d.toLocaleDateString("en-US", { weekday: "short" })
  const day = d.getDate()
  const mon = d.toLocaleDateString("en-US", { month: "short" })
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition ${
        isNext
          ? "border-gold/30"
          : "border-white/[0.055] hover:border-gold/30"
      }`}
      style={{
        background: isNext
          ? "linear-gradient(100deg, rgba(201,162,39,0.07), rgba(17,17,16,0.95))"
          : "linear-gradient(165deg, #171614, #111110)",
      }}
    >
      <div className="w-11 flex-none border-r border-white/[0.07] pr-3.5 text-center">
        <div className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">
          {dow}
        </div>
        <div className="font-display text-2xl leading-[1.2] text-gold-hi">
          {day}
        </div>
        <div className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">
          {mon}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-display text-base font-normal tracking-[0.03em]">
          {event.title}
        </h4>
        <div className="mt-0.5 truncate text-[15px] text-muted">
          {event.capacity && event.capacity > 0
            ? <>Three days · <b className="font-normal text-gold">{event.attending} of {event.capacity} places</b></>
            : <>{time} · {event.location ? <b className="font-normal text-gold">{event.location}</b> : <b className="font-normal text-gold">{event.guild}</b>}</>
          }
        </div>
      </div>
      <div className="flex flex-none flex-col items-end gap-1.5">
        {event.capacity ? (
          <>
            <span className="font-mono text-[9px] text-faint">Limited</span>
            <button className="rounded border border-gold/35 px-2.5 py-1.5 font-mono text-[9px] tracking-[0.1em] text-gold uppercase transition hover:bg-gold/10">
              Apply
            </button>
          </>
        ) : (
          <>
            <span className="font-mono text-[9px] text-faint">
              <b className="font-normal text-muted">{event.attending}</b> going
            </span>
            <div className="flex gap-1">
              <RsvpButton state={event.rsvp} value="going" label="Going" />
              <RsvpButton state={event.rsvp} value="declined" label="Can't" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function RsvpButton({
  state,
  value,
  label,
}: {
  state: Gathering["rsvp"]
  value: "going" | "declined"
  label: string
}) {
  const active = state === value
  return (
    <button
      className={`cursor-pointer rounded border px-2.5 py-1.5 font-mono text-[9px] tracking-[0.1em] uppercase transition ${
        active
          ? "border-gold/45 bg-gold/15 text-gold-hi"
          : "border-white/10 text-faint hover:border-gold/35 hover:text-gold"
      }`}
    >
      {label}
    </button>
  )
}

interface Group {
  label: string
  items: Gathering[]
}

function groupByMonth(items: Gathering[]): Group[] {
  const now = new Date()
  const groups: Group[] = []
  for (const item of items) {
    const d = new Date(item.startsAt)
    const sameYear = d.getFullYear() === now.getFullYear()
    const label = sameYear
      ? d.toLocaleDateString("en-US", { month: "long" })
      : d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    let g = groups.find(x => x.label === label)
    if (!g) {
      g = { label, items: [] }
      groups.push(g)
    }
    g.items.push(item)
  }
  return groups
}
