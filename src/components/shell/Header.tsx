"use client"

import Link from "next/link"
import { LogOut } from "lucide-react"

interface HeaderProps {
  user: {
    username: string
    name: string
  } | null
}

// Authentik-hosted invalidation flow. The proxy outpost's own
// /sign_out endpoint was returning EOF/502 on our setup; the plain
// invalidation flow URL is stable. Brand.default_application is set
// to neo-sanctum so a fresh login after logout lands here again.
const LOGOUT_URL = "https://auth.skymasons.xyz/if/flow/sanctum-logout/"

export function Header({ user }: HeaderProps) {
  if (!user) return null

  return (
    <header className="glass rounded-2xl flex h-12 shrink-0 items-center justify-end gap-4 px-5">
      <span className="rounded border border-gold/30 px-1.5 py-0.5 text-[10px] tracking-wider text-gold/60">neo</span>
      <Link
        href="/settings"
        className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <span className="text-sm text-gray-light">{user.name}</span>
        <img
          src={`/api/avatar/${user.username}/32`}
          alt={user.name}
          className="h-8 w-8 rounded-full border border-white/10"
        />
      </Link>
      <a
        href={LOGOUT_URL}
        className="flex items-center gap-1.5 text-sm text-gray transition-colors hover:text-gold"
      >
        <LogOut className="h-4 w-4" />
        <span>Depart</span>
      </a>
    </header>
  )
}
