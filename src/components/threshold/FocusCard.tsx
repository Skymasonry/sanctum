import Link from "next/link"
import { MessageCircle, Calendar, Target, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export type FocusType = "pulse" | "rite" | "quest" | "scroll"

interface FocusCardProps {
  type: FocusType
  title: string
  description: string
  href: string
  meta?: string
  avatars?: string[]
  progress?: { current: number; total: number }
}

const typeConfig = {
  pulse: {
    icon: MessageCircle,
    cta: "Enter the Cove",
    label: "The Chat",
  },
  rite: {
    icon: Calendar,
    cta: "View Rite",
    label: "Upcoming Rite",
  },
  quest: {
    icon: Target,
    cta: "Join Quest",
    label: "Active Quest",
  },
  scroll: {
    icon: FileText,
    cta: "Respond",
    label: "Awaiting Response",
  },
}

export function FocusCard({ type, title, description, href, meta, avatars, progress }: FocusCardProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <Link
      href={href}
      className={cn(
        "ornate-border group relative block overflow-hidden rounded-lg",
        "bg-gradient-to-b from-black-light to-black",
        "transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-guild/50 hover:shadow-lg hover:shadow-guild/10"
      )}
    >
      {/* Corner ornaments */}
      <div className="ornate-corner ornate-corner-tl" />
      <div className="ornate-corner ornate-corner-tr" />
      <div className="ornate-corner ornate-corner-bl" />
      <div className="ornate-corner ornate-corner-br" />

      {/* Glow line */}
      <div className="glow-line absolute inset-x-0 top-1/2" />

      <div className="relative z-10 p-6">
        {/* Type label */}
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded bg-guild/20 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-guild">
            {config.label}
          </span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-guild/10">
              <Icon className="h-6 w-6 text-guild" />
            </div>
            <div>
              <h3 className="font-display text-xl font-medium tracking-wide text-white">{title}</h3>
              {meta && <p className="mt-0.5 text-sm text-gray">{meta}</p>}
            </div>
          </div>

          {avatars && avatars.length > 0 && (
            <div className="flex -space-x-2">
              {avatars.slice(0, 4).map((avatar, i) => (
                <img
                  key={i}
                  src={avatar}
                  alt=""
                  className="h-8 w-8 rounded-full border-2 border-black object-cover"
                />
              ))}
              {avatars.length > 4 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-gray-dark text-xs text-gray-light">
                  +{avatars.length - 4}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <p className="mt-4 text-gray-light">
          {type === "pulse" ? (
            <span className="italic">&ldquo;{description}&rdquo;</span>
          ) : (
            description
          )}
        </p>

        {/* Progress bar for quests */}
        {type === "quest" && progress && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray">
              <span>Progress</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-dark">
              <div 
                className="h-full rounded-full bg-guild transition-all duration-500"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray">
            {type === "pulse" && avatars && avatars.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Active now
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-guild transition-colors group-hover:text-white">
            {config.cta} →
          </span>
        </div>
      </div>
    </Link>
  )
}
