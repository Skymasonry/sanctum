"use client"

import { cn } from "@/lib/utils"

interface CategoryChipsProps {
  categories: { name: string; count: number }[]
  selected: string
  onSelect: (category: string) => void
}

export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  if (categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect("")}
        className={cn(
          "rounded-full px-3 py-1 text-xs transition-colors",
          selected === "" ? "bg-gold/20 text-gold" : "bg-gray-dark/50 text-gray hover:text-white"
        )}
      >
        All
      </button>
      {categories.map(({ name, count }) => (
        <button
          key={name}
          onClick={() => onSelect(name === selected ? "" : name)}
          className={cn(
            "rounded-full px-3 py-1 text-xs transition-colors",
            selected === name ? "bg-gold/20 text-gold" : "bg-gray-dark/50 text-gray hover:text-white"
          )}
        >
          {name} <span className="opacity-60">{count}</span>
        </button>
      ))}
    </div>
  )
}
