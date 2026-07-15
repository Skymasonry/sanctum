import { Hammer } from "lucide-react"
import { redirect } from "next/navigation"

import { ChamberHeader } from "@/components/shared"
import { GuildBuilder } from "@/components/home/GuildBuilder"
import { getUser } from "@/lib/auth"

export default async function CreateGuildPage() {
  const user = await getUser()
  if (!user) redirect("/")

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-6 lg:p-8">
      <ChamberHeader
        backHref="/"
        icon={<Hammer className="h-10 w-10 text-guild" />}
        title="Seed a Guild"
        subtitle="Bring a new chamber into the sanctum"
      />
      <GuildBuilder />
    </div>
  )
}
