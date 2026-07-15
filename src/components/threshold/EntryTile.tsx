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
        "group relative block rounded-lg bg-black-light p-5",
        "border border-gray-dark transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-guild/50"
      )}
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-2.5 -top-2.5 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-black-deep bg-guild px-2 text-sm font-bold leading-none text-black-deep shadow-lg">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-guild/10">
          <Icon className="h-4 w-4 text-guild" />
        </div>
        <span className="font-display text-sm font-medium tracking-wide text-white transition-colors group-hover:text-guild">
          {title}
        </span>
      </div>
      <p className="mt-3 text-sm text-gray">{description}</p>
    </Wrapper>
  )
}
