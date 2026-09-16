import { notFound } from "next/navigation"
import Link from "next/link"

import { ChamberScroll } from "@/components/shared"
import { ContentBlocksView } from "@/components/scrolls/ContentBlocksView"
import { getScrollByGuild } from "@/lib/scrolls"

const FSTS_GUILD_ID = "from-sky-to-stone"

/**
 * /join — public landing page. Shows the full application letter and
 * offers two paths: log in (existing members) or sign up (new members).
 * No auth required — Caddy passes this through unauthenticated.
 */
export default async function JoinPage() {
  const scroll = await getScrollByGuild(FSTS_GUILD_ID)
  if (!scroll) notFound()

  return (
    <div className="glass flex h-full flex-col overflow-hidden" style={{ borderRadius: "var(--panel-radius)" }}>
      <ChamberScroll maxWidth="max-w-3xl">
        <h1 className="mb-6 font-display text-2xl font-semibold tracking-wide text-white">
          {scroll.title}
        </h1>

        {scroll.headerImageUrl && (
          <div className="mb-6 overflow-hidden rounded-lg border border-gray-dark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={scroll.headerImageUrl} alt="" className="h-72 w-full object-cover" />
          </div>
        )}

        {scroll.contentBlocks.length > 0 && (
          <ContentBlocksView blocks={scroll.contentBlocks} />
        )}

        <div className="mt-10 flex flex-col gap-3 border-t border-gray-dark pt-8 sm:flex-row">
          <Link
            href="/join/form"
            className="flex-1 rounded-lg bg-guild px-6 py-3 text-center text-sm font-medium text-black-deep transition-colors hover:bg-guild/80"
          >
            Log in and fill out form
          </Link>
          <Link
            href="/join/apply"
            className="flex-1 rounded-lg border border-guild/40 px-6 py-3 text-center text-sm font-medium text-guild transition-colors hover:bg-guild/10"
          >
            Sign up and fill out form
          </Link>
        </div>
      </ChamberScroll>
    </div>
  )
}
