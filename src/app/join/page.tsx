import { notFound } from "next/navigation"

import { ChamberScroll } from "@/components/shared"
import { JoinScrollForm } from "@/components/scrolls/JoinScrollForm"
import { getUser } from "@/lib/auth"
import { getScrollByGuild } from "@/lib/scrolls"

const FSTS_GUILD_ID = "from-sky-to-stone"

/**
 * /join — authenticated entry point for the From Sky To Stone application.
 *
 * This page is behind Caddy's forward_auth (same as all other app routes —
 * only /public/scrolls/* is excluded). Sky Masons who already have a Sanctum
 * account can reach this URL directly; Caddy redirects anyone without a session
 * to the Authentik login flow first.
 *
 * On submit the form calls /api/scrolls/[id]/submissions (authenticated path),
 * which records the answers and immediately adds the user to The Brotherhood
 * + From Sky To Stone guilds.
 */
export default async function JoinPage() {
  const [user, scroll] = await Promise.all([
    getUser(),
    getScrollByGuild(FSTS_GUILD_ID),
  ])

  if (!user || !scroll) notFound()

  return (
    <div className="glass flex h-full flex-col overflow-hidden" style={{ borderRadius: "var(--panel-radius)" }}>
      <ChamberScroll maxWidth="max-w-3xl">
        <h1 className="mb-6 font-display text-2xl font-semibold tracking-wide text-white">
          {scroll.title}
        </h1>
        <JoinScrollForm scroll={scroll} currentUser={user.username} />
      </ChamberScroll>
    </div>
  )
}
