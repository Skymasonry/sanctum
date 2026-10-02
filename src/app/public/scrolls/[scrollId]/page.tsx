import { notFound } from "next/navigation"

import { PublicScrollForm } from "@/components/scrolls/PublicScrollForm"
import { ChamberScroll } from "@/components/shared"
import { getScroll } from "@/lib/scrolls"

interface PublicScrollPageProps {
  params: Promise<{ scrollId: string }>
}

/**
 * Reachable without a Sanctum account — Caddy excludes /public/scrolls/*
 * from Authentik forward_auth (see the neo Caddyfile's @public_scrolls
 * matcher). getScroll() alone would leak any scroll to anyone who
 * guessed its id, so this only ever renders one that's both published
 * and explicitly opted into publicAccess by its seeder.
 */
export default async function PublicScrollPage({ params }: PublicScrollPageProps) {
  const { scrollId } = await params
  const scroll = await getScroll(scrollId)
  if (!scroll || !scroll.publicAccess || !scroll.published) notFound()

  return (
    <div className="glass flex h-full flex-col overflow-hidden" style={{ borderRadius: 'var(--panel-radius)' }}>
      <ChamberScroll maxWidth="max-w-3xl">
        <h1 className="mb-6 font-display text-2xl font-semibold tracking-wide text-white">
          {scroll.title}
        </h1>
        <PublicScrollForm scroll={scroll} />
      </ChamberScroll>
    </div>
  )
}
