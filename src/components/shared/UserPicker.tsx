"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"

interface SearchResult {
  username: string
  name: string
}

interface UserPickerProps {
  picked: string[]
  onAdd: (username: string) => void
  onRemove: (username: string) => void
  placeholder?: string
}

/**
 * Search-any-Mason autocomplete + picked-list — for naming people who
 * aren't necessarily guild members yet (Leadership Circle at guild
 * creation, before the guild has any members at all). Debounced
 * search against /api/users/search (proxies Nextcloud's own user
 * directory via skymasonsnav).
 */
export function UserPicker({ picked, onAdd, onRemove, placeholder }: UserPickerProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`)
        const data = (await res.json()) as { users?: SearchResult[] }
        setResults((data.users ?? []).filter(u => !picked.some(p => p.toLowerCase() === u.username.toLowerCase())))
      } catch {
        setResults([])
      }
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-running on `picked` would refetch on every add/remove; filtering happens on the existing results too
  }, [query])

  const pick = (u: SearchResult) => {
    onAdd(u.username)
    setQuery("")
    setResults([])
    setOpen(false)
  }

  return (
    <div>
      {picked.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {picked.map(p => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-dark bg-black-deep px-3 py-1 text-sm text-gray-light"
            >
              {p}
              <button
                type="button"
                onClick={() => onRemove(p)}
                className="text-faint transition hover:text-danger"
                aria-label={`Remove ${p}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder ?? "Search by name or username…"}
          className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
        />
        {open && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-dark bg-black-deep shadow-xl">
            {results.map(u => (
              <button
                key={u.username}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(u)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-light hover:bg-guild/10 hover:text-guild"
              >
                <span className="font-medium">{u.name || u.username}</span>
                {u.name && <span className="text-xs text-faint">@{u.username}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
