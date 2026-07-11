"use client"

import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface CategoryGroupProps {
  title: string
  count: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  children: React.ReactNode
}

export function CategoryGroup({ title, count, isCollapsed, onToggleCollapse, children }: CategoryGroupProps) {
  return (
    <div>
      <button
        onClick={onToggleCollapse}
        className="mb-3 flex w-full items-center gap-2 text-left"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 text-gray transition-transform", isCollapsed && "-rotate-90")} />
        <span className="font-display text-xs font-medium uppercase tracking-widest text-gray-light">{title}</span>
        <span className="rounded bg-gray-dark/50 px-1.5 py-0.5 text-[10px] text-gray">{count}</span>
      </button>
      {!isCollapsed && children}
    </div>
  )
}
