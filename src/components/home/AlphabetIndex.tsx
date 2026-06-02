"use client"

import { cn } from "@/lib/utils"

interface AlphabetIndexProps {
  availableLetters: Set<string>
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

export function AlphabetIndex({ availableLetters }: AlphabetIndexProps) {
  return (
    <div className="flex flex-col gap-0.5 text-center">
      {LETTERS.map((letter) => {
        const available = availableLetters.has(letter)
        return (
          <a
            key={letter}
            href={available ? `#guild-letter-${letter}` : undefined}
            className={cn(
              "text-[10px] leading-4 transition-colors",
              available ? "text-gray hover:text-gold cursor-pointer" : "text-gray-dark cursor-default"
            )}
          >
            {letter}
          </a>
        )
      })}
    </div>
  )
}
