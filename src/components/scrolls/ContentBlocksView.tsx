import type { ContentBlock } from "@/lib/scrolls"

interface ContentBlocksViewProps {
  blocks: ContentBlock[]
}

/**
 * Read-only rendering of a scroll's designed page content — shared
 * between the in-app ScrollDetail and the public, unauthenticated
 * scroll page.
 */
export function ContentBlocksView({ blocks }: ContentBlocksViewProps) {
  if (blocks.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      {blocks.map(b =>
        b.type === "heading" ? (
          <h2 key={b.id} className="mt-2 font-display text-lg tracking-wide text-guild first:mt-0">
            {b.text}
          </h2>
        ) : (
          <p key={b.id} className="whitespace-pre-line text-sm leading-relaxed text-gray-light">
            {b.text}
          </p>
        ),
      )}
    </div>
  )
}
