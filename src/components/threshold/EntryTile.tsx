import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EntryTileProps {
  href: string
  icon: LucideIcon
  title: string
  description: string
  badge?: number
  external?: boolean
}

export function EntryTile({ href, icon: Icon, title, description, badge, external }: EntryTileProps) {
  const Wrapper = external ? "a" : Link
  const linkProps = external
    ? { href, target: "_blank" as const, rel: "noopener noreferrer" }
    : { href }

  return (
    <Wrapper
      {...linkProps}
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-xl bg-black-light",
        "px-4 py-6 text-center transition-all duration-200",
        "border border-gray-dark hover:-translate-y-0.5 hover:border-guild/60 hover:bg-guild/5",
      )}
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-2.5 -top-2.5 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-black-deep bg-guild px-2 text-sm font-bold leading-none text-black-deep shadow-lg">
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      {/* Icon medallion — dominant visual */}
      <div
        className={cn(
          "mb-3 flex h-16 w-16 items-center justify-center rounded-2xl",
          "bg-guild/12 ring-1 ring-guild/30 transition-all duration-200",
          "group-hover:bg-guild/20 group-hover:ring-guild/60",
        )}
      >
        <Icon
          className="h-8 w-8 text-guild transition-transform duration-200 group-hover:scale-110"
          strokeWidth={1.5}
        />
      </div>

      <span className="font-display text-base font-medium tracking-wide text-white transition-colors group-hover:text-guild">
        {title}
      </span>
      <p className="mt-1 text-xs text-gray">{description}</p>
    </Wrapper>
  )
}
