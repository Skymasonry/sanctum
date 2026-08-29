import { Settings as SettingsIcon } from "lucide-react"
import { notFound, redirect } from "next/navigation"

import { ChamberSettings } from "@/components/guild-settings/ChamberSettings"
import { InfoSettings } from "@/components/guild-settings/InfoSettings"
import { ChamberHeader } from "@/components/shared"
import { getUser } from "@/lib/auth"
import { getGuild } from "@/lib/guilds"

interface GuildSettingsPageProps {
  params: Promise<{ guildId: string }>
}

export default async function GuildSettingsPage({ params }: GuildSettingsPageProps) {
  const { guildId } = await params
  const [guild, user] = await Promise.all([getGuild(guildId), getUser()])

  if (!guild) notFound()
  if (!user) redirect("/")
  if (user.username.toLowerCase() !== guild.seederUid.toLowerCase()) {
    // Only the seeder can view / edit guild settings.
    redirect(`/guild/${guildId}`)
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-6 lg:p-8">
      <ChamberHeader
        backHref={`/guild/${guildId}`}
        icon={<SettingsIcon className="h-10 w-10 text-guild" />}
        title="Guild Settings"
        subtitle={guild.name}
      />

      <section className="mt-2 glass-light rounded-[var(--card-radius)] p-5">
        <h2 className="mb-1 font-display text-lg tracking-wide text-white">Guild info</h2>
        <p className="mb-4 text-sm text-gray">
          Name, purpose, and ethos shown on the guild home and in Discover.
        </p>
        <InfoSettings
          guildId={guildId}
          initialName={guild.name}
          initialDescription={guild.description}
          initialEvolutionaryPurpose={guild.evolutionaryPurpose ?? ""}
          initialPatternIntegrity={guild.patternIntegrity ?? ""}
        />
      </section>

      <section className="mt-5 glass-light rounded-[var(--card-radius)] p-5">
        <h2 className="mb-1 font-display text-lg tracking-wide text-white">Chambers</h2>
        <p className="mb-4 text-sm text-gray">
          Toggle which chambers appear on this guild&apos;s home page.
        </p>
        <ChamberSettings guildId={guildId} initial={guild.chambers} />
      </section>
    </div>
  )
}
