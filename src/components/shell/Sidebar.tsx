"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion, LayoutGroup } from "framer-motion"
import { cn } from "@/lib/utils"
import { useThresholdSignals, type GuildSignal } from "@/lib/hooks/useThresholdSignals"
import type { Guild } from "@/types/guild"
import { InviteButton } from "./InviteButton"

const PINNED_GUILD = "The Brotherhood"
const STORAGE_KEY = "guild-access-order"

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

  // Load access order from localStorage on mount
  useEffect(() => {
    setAccessOrder(getAccessOrder())
  }, [])

  // Record access when guild changes
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
    // Pin The Brotherhood to top
    if (a.name === PINNED_GUILD) return -1
    if (b.name === PINNED_GUILD) return 1
    // Then sort by recent access
    const aIdx = accessOrder.indexOf(a.id)
    const bIdx = accessOrder.indexOf(b.id)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return 0
  })

  return (
    <aside className="flex h-screen w-[72px] flex-col items-center border-r border-gray-dark bg-black-deep py-4">
      {/* Logo */}
      <Link
        href="/"
        className="mb-6 flex h-12 w-12 items-center justify-center transition-opacity hover:opacity-80"
      >
        <Image
          src="/logo.jpg"
          alt="Skymasons"
          width={40}
          height={40}
          className="rounded-full"
        />
      </Link>

      {/* Divider */}
      <div className="mb-4 h-px w-8 bg-gray-dark" />

      {/* Guild Icons */}
      <nav className="flex flex-1 flex-col items-center gap-2">
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
        <div className="mb-2 h-px w-8 bg-gray-dark" />
        <div className="group relative">
          <InviteButton />
        </div>
      </div>
    </aside>
  )
}

interface SidebarItemProps {
  guild: Guild
  isActive: boolean
  signal?: GuildSignal
}

const QUICK_LINKS = [
  { label: "The Chat", path: "pulse" },
  { label: "Rites", path: "rites" },
]
const CHAMBER_HREF = (guildId: string) => `https://meet.talitamoss.info/${guildId}`

function SidebarItem({ guild, isActive, signal }: SidebarItemProps) {
  const [open, setOpen] = useState(false)
  const [flipUp, setFlipUp] = useState(false)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemRef = useRef<HTMLDivElement>(null)

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    openTimer.current = setTimeout(() => {
      if (itemRef.current) {
        const rect = itemRef.current.getBoundingClientRect()
        setFlipUp(rect.bottom + 80 > window.innerHeight)
      }
      setOpen(true)
    }, 150)
  }

  function handleMouseLeave() {
    if (openTimer.current) clearTimeout(openTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 200)
  }

  return (
    <motion.div
      ref={itemRef}
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
          "relative flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all duration-150",
          "hover:scale-110 hover:bg-black-light",
          isActive && "bg-black-light"
        )}
        style={{
          boxShadow: isActive ? `inset 0 0 0 2px ${guild.color}` : "none",
        }}
        title={guild.name}
      >
        {isActive && (
          <motion.div
            layoutId="active-pip"
            className="absolute -left-[5px] top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: guild.color }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
        )}
        <span style={{ color: guild.color }}>{guild.icon?.startsWith("data:") ? <img src={guild.icon} alt="" className="h-5 w-5 object-contain" /> : guild.icon}</span>

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
          "absolute left-full z-50 pl-2 transition-all duration-150",
          flipUp ? "bottom-0" : "top-1/2 -translate-y-1/2",
          open ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none -translate-x-1 opacity-0"
        )}
      >
        <div className="min-w-[160px] overflow-hidden rounded-lg border border-gray-dark bg-black shadow-xl">
          <div
            className="border-b border-gray-dark px-3 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: guild.color }}
          >
            {guild.name}
          </div>
          <a
            href={CHAMBER_HREF(guild.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 text-sm text-gray transition-colors hover:bg-black-light hover:text-white"
          >
            The Chamber
          </a>
          {QUICK_LINKS.map(({ label, path }) => (
            <Link
              key={label}
              href={`/guild/${guild.id}/${path}`}
              className="block px-3 py-2 text-sm text-gray transition-colors hover:bg-black-light hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
