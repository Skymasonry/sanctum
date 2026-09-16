import { notFound, redirect } from "next/navigation"

import { ChamberScroll } from "@/components/shared"
import { JoinScrollForm } from "@/components/scrolls/JoinScrollForm"
import { getUser } from "@/lib/auth"
import { getScrollByGuild } from "@/lib/scrolls"

const FSTS_GUILD_ID = "from-sky-to-stone"

/**
 * /join/form — authenticated form path.
 * Caddy's forward_auth covers this route (not in the public_routes exemption),
 * so only logged-in members reach it. Submitting immediately adds them to
 * all FSTS guilds.
 */
export default async function JoinFormPage() {
  const [user, scroll] = await Promise.all([
    getUser(),
    getScrollByGuild(FSTS_GUILD_ID),
  ])

  if (!scroll) notFound()
  if (!user) redirect("/join")

  return (
    <div className="glass flex h-full flex-col overflow-hidden" style={{ borderRadius: "var(--panel-radius)" }}>
      <ChamberScroll maxWidth="max-w-3xl">
        <h1 className="mb-6 font-display text-2xl font-semibold tracking-wide text-white">
          {scroll.title}
        </h1>
        <JoinScrollForm scroll={{ ...scroll, contentBlocks: [], headerImageUrl: null }} currentUser={user.username} />
      </ChamberScroll>
    </div>
  )
}
