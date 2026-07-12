import type { ThresholdMember } from "@/types/threshold"

interface ThresholdHeaderProps {
  member: ThresholdMember
  stirringCount: number
  gatheringsCount: number
}

export function ThresholdHeader({
  member,
  stirringCount,
  gatheringsCount,
}: ThresholdHeaderProps) {
  const sinceLabel = formatSince(member.lastSeen)

  return (
    <header
      className="border-b border-white/5 px-10 pt-11 pb-8"
      style={{
        backgroundImage:
          "radial-gradient(900px 220px at 8% -40%, rgba(201,162,39,0.09), transparent 70%), linear-gradient(180deg, #0e0d0c, #0a0a0a)",
      }}
    >
      <div className="mb-3 font-mono text-[10px] tracking-[0.34em] text-gold/60 uppercase">
        Per Aspera Ad Astra
      </div>
      <h1 className="font-display text-[38px] font-normal leading-[1.1] tracking-[0.03em] text-gold-hi">
        {member.name}
      </h1>
      <p className="mt-3 text-[17px] text-muted">
        {stirringCount > 0 ? (
          <>
            <b className="font-medium text-text">
              {stirringCount === 1
                ? "One guild has"
                : `${numberWord(stirringCount)} guilds have`}
            </b>{" "}
            stirred{sinceLabel ? ` since ${sinceLabel}` : ""}.
          </>
        ) : (
          <>The hall is quiet{sinceLabel ? ` since ${sinceLabel}` : ""}.</>
        )}{" "}
        {gatheringsCount > 0 ? (
          <>
            <b className="font-medium text-text">
              {gatheringsCount === 1
                ? "One gathering"
                : `${numberWord(gatheringsCount)} gatherings`}
            </b>{" "}
            this fortnight.
          </>
        ) : null}
      </p>
    </header>
  )
}

function formatSince(iso: string | null): string | null {
  if (!iso) return null
  const then = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  const hours = diffMs / 3_600_000
  if (hours < 1) return "just now"
  if (hours < 24) return "earlier today"
  const days = Math.floor(hours / 24)
  if (days === 1) return "yesterday"
  if (days < 7) {
    // Day-of-week name
    return then.toLocaleDateString("en-US", { weekday: "long" })
  }
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
]
function numberWord(n: number): string {
  return WORDS[n] ?? String(n)
}
