import { cn } from "@/lib/utils"

interface ChamberScrollProps {
  children: React.ReactNode
  /** Tailwind max-width class, e.g. "max-w-3xl". Omit for full width. */
  maxWidth?: string
  className?: string
}

/**
 * Standard scrollable page shell. The scroll region spans the full
 * panel width — not just a centered column — so the mouse can scroll
 * from anywhere over the panel, not only over the middle of it (the
 * bug this fixes: a scrollable div nested *inside* a max-width column
 * only responds to the wheel where that column actually is).
 *
 * Use this for any page whose content should scroll as one block.
 * Chambers with their own bespoke scrolling (chat's pinned input,
 * the quest board's per-column scroll, the doc editor's own scroll
 * box) should keep managing that themselves — wrapping them in this
 * too would fight their layout, not fix it.
 */
export function ChamberScroll({ children, maxWidth, className }: ChamberScrollProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="scrollbar-none h-full min-h-0 flex-1 overflow-y-auto">
        <div className={cn("p-6 lg:p-8", maxWidth && `mx-auto w-full ${maxWidth}`, className)}>
          {children}
        </div>
      </div>
    </div>
  )
}
