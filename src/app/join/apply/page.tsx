import { notFound } from "next/navigation"

import { ChamberScroll } from "@/components/shared"
import { PublicScrollForm } from "@/components/scrolls/PublicScrollForm"
import { getScrollByGuild } from "@/lib/scrolls"

const FSTS_GUILD_ID = "from-sky-to-stone"

/**
 * /join/apply — public form path for new members who don't have a
 * Sanctum account yet. No auth required. Submitting records their answers
 * and stores pending guild memberships against their email; these are
 * applied automatically when their account is created.
 */
export default async function JoinApplyPage() {
  const scroll = await getScrollByGuild(FSTS_GUILD_ID)
  if (!scroll) notFound()

  return (
    <div className="glass flex h-full flex-col overflow-hidden" style={{ borderRadius: "var(--panel-radius)" }}>
      <ChamberScroll maxWidth="max-w-3xl">
        <h1 className="mb-6 font-display text-2xl font-semibold tracking-wide text-white">
          {scroll.title}
        </h1>
        <PublicScrollForm scroll={scroll} />
      </ChamberScroll>
    </div>
  )
}
