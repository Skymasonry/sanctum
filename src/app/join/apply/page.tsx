import { notFound } from "next/navigation"
import Link from "next/link"

import { ChamberScroll } from "@/components/shared"
import { PublicScrollForm } from "@/components/scrolls/PublicScrollForm"
import { getScrollByGuild } from "@/lib/scrolls"

const FSTS_GUILD_ID = "from-sky-to-stone"

/**
 * /join/apply — public form path for new members who don't have a
 * Sanctum account yet. No auth required. Submitting records their answers
 * and stores pending guild memberships against their email; these are
 * applied automatically when their account is created.
 *
 * `?as=guest` is the guest path: the same questions, but no password and
 * no account — the submission is just recorded, flagged as a guest's.
 * It lives here rather than at its own route so it stays covered by
 * Caddy's existing public exemption for /join/apply.
 */
export default async function JoinApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>
}) {
  const [scroll, { as }] = await Promise.all([getScrollByGuild(FSTS_GUILD_ID), searchParams])
  if (!scroll) notFound()
  const guest = as === "guest"

  return (
    <div className="glass flex h-full flex-col overflow-hidden" style={{ borderRadius: "var(--panel-radius)" }}>
      <ChamberScroll maxWidth="max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-wide text-white">
            {scroll.title}
          </h1>
          <Link href="/join" className="text-xs text-faint hover:text-guild transition-colors">
            ← Back to invitation letter
          </Link>
        </div>
        {guest && (
          <p className="mb-6 text-sm text-gray-light">
            Registering as a guest. No Sanctum account is created.
          </p>
        )}
        <PublicScrollForm scroll={{ ...scroll, contentBlocks: scroll.contentBlocks.filter(b => b.type === "agreement"), headerImageUrl: null }} guest={guest} />
      </ChamberScroll>
    </div>
  )
}
