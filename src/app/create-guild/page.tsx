import { Hammer } from "lucide-react"
import { redirect } from "next/navigation"

import { ChamberHeader } from "@/components/shared"
import { GuildBuilder } from "@/components/home/GuildBuilder"
import { getUser } from "@/lib/auth"

export default async function CreateGuildPage() {
  const user = await getUser()
  if (!user) redirect("/")

  return (
    <div className="glass flex h-full flex-col overflow-hidden" style={{ borderRadius: 'var(--panel-radius)' }}>
      <div className="scrollbar-none h-full min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col p-6 lg:p-8">
          <ChamberHeader
            backHref="/"
            icon={<Hammer className="h-10 w-10 text-guild" />}
            title="Seed a Guild"
            subtitle="Bring a new chamber into the sanctum"
          />
          <GuildBuilder />
        </div>
      </div>
    </div>
  )
}
