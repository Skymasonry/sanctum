"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, LayoutGroup } from "framer-motion"
import { Compass, Plus, ExternalLink, MessageSquare, Scroll } from "lucide-react"
import { GuildIcon } from "@/components/shared"
import { cn } from "@/lib/utils"
import { useThresholdSignals, type GuildSignal } from "@/lib/hooks/useThresholdSignals"
import type { Guild } from "@/types/guild"
import { InviteButton } from "./InviteButton"

const PINNED_GUILD = "The Brotherhood"
const STORAGE_KEY = "guild-access-order"
const CHAMBER_HREF = (guildId: string) => `https://meet.talitamoss.info/${guildId}`

interface SidebarProps {
  guilds: Guild[]
}

function getAccessOrder(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  } catch {
    return []
  }
}

function recordAccess(guildId: string) {
  const order = getAccessOrder().filter((id) => id !== guildId)
  order.unshift(guildId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order.slice(0, 20)))
}

export function Sidebar({ guilds }: SidebarProps) {
  const pathname = usePathname()
  const currentGuildId = pathname.match(/\/guild\/([^/]+)/)?.[1]
  const [accessOrder, setAccessOrder] = useState<string[]>([])
  const signals = useThresholdSignals()

  useEffect(() => {
    setAccessOrder(getAccessOrder())
  }, [])

  useEffect(() => {
    if (currentGuildId) {
      const guild = guilds.find((g) => g.id === currentGuildId)
      if (guild && guild.name !== PINNED_GUILD) {
        recordAccess(currentGuildId)
        setAccessOrder(getAccessOrder())
      }
    }
  }, [currentGuildId, guilds])

  const sortedGuilds = [...guilds].sort((a, b) => {
    if (a.name === PINNED_GUILD) return -1
    if (b.name === PINNED_GUILD) return 1
    const aIdx = accessOrder.indexOf(a.id)
    const bIdx = accessOrder.indexOf(b.id)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return 0
  })

  return (
    <aside className="glass rounded-[20px] flex h-full w-[68px] shrink-0 flex-col items-center py-4">
      {/* Logo — Cinzel "S" monogram */}
      <Link
        href="/"
        className="mb-5 flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-80"
      >
        <div
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full"
          style={{
            background: 'rgba(201,162,39,0.12)',
            border: '1px solid rgba(201,162,39,0.2)',
          }}
        >
          <span
            className="font-display text-[15px] font-normal leading-none"
            style={{ color: 'rgba(201,162,39,0.8)' }}
          >
            S
          </span>
        </div>
      </Link>

      {/* Divider */}
      <div className="mb-4 h-px w-8 bg-white/10" />

      {/* Guild Icons */}
      <nav className="scrollbar-none flex flex-1 flex-col items-center gap-1.5 overflow-y-auto">
        <LayoutGroup>
          {sortedGuilds.map((guild) => (
            <SidebarItem
              key={guild.id}
              guild={guild}
              isActive={currentGuildId === guild.id}
              signal={signals.get(guild.id)}
            />
          ))}
        </LayoutGroup>
      </nav>

      {/* Bottom actions */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="mb-1 h-px w-8 bg-white/10" />
        <Link
          href="/create-guild"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[10px] text-ember/70 transition-all duration-150",
            "hover:bg-white/08 hover:text-ember",
            pathname === "/create-guild" && "bg-white/08 text-ember",
          )}
          title="Seed a new guild"
          aria-label="Seed a new guild"
        >
          <Plus className="h-[14px] w-[14px]" strokeWidth={2.5} />
        </Link>
        <Link
          href="/discover"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[10px] text-gold/60 transition-all duration-150",
            "hover:bg-white/08 hover:text-gold",
            pathname === "/discover" && "bg-white/08 text-gold",
          )}
          title="Discover guilds"
          aria-label="Discover guilds"
        >
          <Compass className="h-[14px] w-[14px]" strokeWidth={2.5} />
        </Link>
        <div className="mt-1 mb-1 h-px w-8 bg-white/10" />
        <InviteButton />
      </div>
    </aside>
  )
}

interface SidebarItemProps {
  guild: Guild
  isActive: boolean
  signal?: GuildSignal
}

function SidebarItem({ guild, isActive, signal }: SidebarItemProps) {
  const [open, setOpen] = useState(false)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    openTimer.current = setTimeout(() => setOpen(true), 350)
  }

  function handleMouseLeave() {
    if (openTimer.current) clearTimeout(openTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  return (
    <motion.div
      layout
      layoutId={guild.id}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={`/guild/${guild.id}`}
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150",
          "hover:bg-white/08",
          isActive && "hover:bg-transparent"
        )}
        style={{
          background: isActive ? 'rgba(201,162,39,0.12)' : undefined,
        }}
        title={guild.name}
      >
        {isActive && (
          <motion.div
            layoutId="active-pip"
            className="absolute -left-[5px] top-1/2 -translate-y-1/2 rounded-[2px]"
            style={{
              backgroundColor: guild.color,
              height: '18px',
              width: '3px',
            }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
        )}
        <GuildIcon icon={guild.icon} color={guild.color} className="h-7 w-7 object-contain" />

        {signal?.isLive ? (
          <span
            aria-label="Live now"
            className="absolute top-1 right-1 h-1.5 w-1.5 animate-beat rounded-full bg-ember"
            style={{ boxShadow: "0 0 6px #d4623a" }}
          />
        ) : signal?.hasUnread ? (
          <span
            aria-label="Unread"
            className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-gold"
          />
        ) : null}
      </Link>

      {/* Hover submenu */}
      <div
        className={cn(
          "pointer-events-none absolute left-full top-1/2 z-50 -translate-y-1/2 pl-3 transition-all duration-200",
          open ? "pointer-events-auto translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
        )}
      >
        <div
          className="w-44 overflow-hidden rounded-xl shadow-2xl"
          style={{
            background: "rgba(12, 8, 4, 0.90)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Guild name header */}
          <div className="border-b border-white/06 px-3 py-2.5">
            <p
              className="font-display text-xs font-semibold tracking-wider"
              style={{ color: guild.color }}
            >
              {guild.name}
            </p>
          </div>

          {/* Links */}
          <div className="p-1">
            <a
              href={CHAMBER_HREF(guild.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-gray-light transition-colors hover:bg-white/06 hover:text-white"
            >
              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
              The Chamber
            </a>
            <Link
              href={`/guild/${guild.id}/pulse`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-gray-light transition-colors hover:bg-white/06 hover:text-white"
            >
              <MessageSquare className="h-3 w-3 shrink-0 opacity-60" />
              The Chat
            </Link>
            <Link
              href={`/guild/${guild.id}/rites`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-gray-light transition-colors hover:bg-white/06 hover:text-white"
            >
              <Scroll className="h-3 w-3 shrink-0 opacity-60" />
              Rites
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
