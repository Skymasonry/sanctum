"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export function ProvisionQuestsButton({ guildId, isSeeder }: { guildId: string; isSeeder: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isSeeder) {
    return (
      <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
        Ask the seeder to open one
      </p>
    )
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null)
          start(async () => {
            try {
              const res = await fetch(`/api/guilds/${guildId}/quests`, { method: "POST" })
              if (!res.ok) {
                const err = (await res.json().catch(() => null)) as { error?: string } | null
                throw new Error(err?.error || `HTTP ${res.status}`)
              }
              router.refresh()
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to provision")
            }
          })
        }}
        className="rounded-md border border-guild/40 bg-guild/10 px-4 py-2 font-mono text-[10px] font-medium tracking-[0.14em] text-guild uppercase transition hover:bg-guild/20 disabled:opacity-50"
      >
        {pending ? "Provisioning…" : "Provision Quest board"}
      </button>
      {error && <p className="mt-3 font-mono text-[10px] text-danger">{error}</p>}
    </>
  )
}
