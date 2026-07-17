import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface ChamberHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  meta?: React.ReactNode
  centered?: boolean
  backHref?: string
}

export function ChamberHeader({ icon, title, subtitle, meta, centered = false, backHref }: ChamberHeaderProps) {
  if (centered) {
    return (
      <div className="mb-8 text-center">
        <div className="mb-3 text-5xl" style={{ textShadow: "0 0 20px rgb(var(--guild-color) / 0.4)" }}>
          {icon}
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-wide text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-light">{subtitle}</p>
        )}
        {meta && <div className="mt-3 text-sm">{meta}</div>}
      </div>
    )
  }

  return (
    <div className="mb-8">
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gray-dark bg-black-light px-3.5 py-1.5 text-sm font-medium text-gray-light transition-colors hover:border-guild/60 hover:bg-guild/10 hover:text-guild"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      )}
      <div className="flex items-center gap-4">
        <span className="text-4xl">{icon}</span>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-wide text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-gray-light">{subtitle}</p>
          )}
        </div>
      </div>
      {meta && <div className="mt-4 text-sm text-gray">{meta}</div>}
    </div>
  )
}
