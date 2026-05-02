"use client"

import Link from "next/link"
import { LogOut } from "lucide-react"

interface HeaderProps {
  user: {
    username: string
    name: string
  } | null
}

export function Header({ user }: HeaderProps) {
  if (!user) return null

  return (
    <header className="flex h-14 items-center justify-end gap-4 border-b border-gray-dark bg-black px-6">
      <Link
        href="/settings"
        className="flex items-center gap-3 transition-opacity hover:opacity-80"
      >
        <span className="text-sm text-gray-light">{user.name}</span>
        <img
          src={`/api/avatar/${user.username}/36`}
          alt={user.name}
          className="h-9 w-9 rounded-full border border-gray-dark"
        />
      </Link>
      <Link
        href="/api/auth/signout"
        className="flex items-center gap-1.5 text-sm text-gray-light transition-colors hover:text-gold"
      >
        <LogOut className="h-4 w-4" />
        <span>Depart</span>
      </Link>
    </header>
  )
}

// neo pipeline test
