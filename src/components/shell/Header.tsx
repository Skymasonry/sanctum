"use client"

import { useState } from "react"
import Link from "next/link"
import { LogOut } from "lucide-react"

interface HeaderProps {
  user: {
    username: string
    name: string
  } | null
}

const LOGOUT_URL = "https://auth.skymasons.xyz/if/flow/sanctum-logout/"

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")
}

export function Header({ user }: HeaderProps) {
  const [imgFailed, setImgFailed] = useState(false)

  if (!user) return null

  return (
    <header className="flex h-12 shrink-0 items-center justify-end gap-3.5 px-5">
      <span className="text-[13px] font-light text-white/45">{user.name}</span>
      <Link href="/settings" className="transition-opacity hover:opacity-80">
        {imgFailed ? (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold"
            style={{ background: 'rgba(201,162,39,0.18)', border: '1px solid rgba(201,162,39,0.3)', color: 'rgba(201,162,39,0.9)' }}
          >
            {initials(user.name || user.username)}
          </div>
        ) : (
          <img
            src={`/api/avatar/${user.username}/32`}
            alt={user.name}
            className="h-8 w-8 rounded-full border"
            style={{ borderColor: 'rgba(201,162,39,0.3)' }}
            onError={() => setImgFailed(true)}
          />
        )}
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
