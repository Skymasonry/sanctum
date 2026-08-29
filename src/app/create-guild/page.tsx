import { Hammer } from "lucide-react"
import { redirect } from "next/navigation"

import { ChamberHeader, ChamberScroll } from "@/components/shared"
import { GuildBuilder } from "@/components/home/GuildBuilder"
import { getUser } from "@/lib/auth"

export default async function CreateGuildPage() {
  const user = await getUser()
  if (!user) redirect("/")

  return (
    <div className="glass flex h-full flex-col overflow-hidden" style={{ borderRadius: 'var(--panel-radius)' }}>
      <ChamberScroll maxWidth="max-w-3xl">
        <ChamberHeader
          backHref="/"
          icon={<Hammer className="h-10 w-10 text-guild" />}
          title="Seed a Guild"
          subtitle="Bring a new chamber into the sanctum"
        />
        <GuildBuilder />
      </ChamberScroll>
    </div>
  )
}
