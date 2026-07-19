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
    <header className="flex h-12 shrink-0 items-center justify-end gap-3.5 px-5">
      <span className="text-[13px] font-light text-white/45">{user.name}</span>
      <Link href="/settings" className="transition-opacity hover:opacity-80">
        <img
          src={`/api/avatar/${user.username}/32`}
          alt={user.name}
          className="h-8 w-8 rounded-full border"
          style={{ borderColor: 'rgba(201,162,39,0.3)' }}
        />
      </Link>
      <a
        href={LOGOUT_URL}
        className="flex items-center gap-1 text-[12px] font-medium text-white/30 transition-colors hover:text-white/60"
      >
        <LogOut className="h-3 w-3" />
        Depart
      </a>
    </header>
  )
}
