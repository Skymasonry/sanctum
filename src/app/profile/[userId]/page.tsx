import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Globe } from "lucide-react"

import { ProfileEditor } from "@/components/profile/ProfileEditor"
import { getUser } from "@/lib/auth"
import { getProfile } from "@/lib/profiles"

interface ProfilePageProps {
  params: Promise<{ userId: string }>
}

interface ContactShape {
  phone?: string
  website?: string
  location?: string
  links?: Array<{ label: string; url: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params
  const viewer = await getUser()
  const profile = await getProfile(userId)
  if (!profile) notFound()

  const isSelf = viewer?.username === userId
  const contact = profile.contact as ContactShape

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-6 lg:p-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs text-gray transition hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      <div className="flex items-start gap-6">
        <img
          src={`/api/avatar/${userId}/96`}
          alt={profile.displayName}
          className="h-24 w-24 flex-shrink-0 rounded-full border border-gold/30"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl tracking-[0.03em] text-gold-hi">
            {profile.displayName}
          </h1>
          <div className="mt-1 font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
            @{profile.userId}
          </div>
          {profile.bio && (
            <p className="mt-4 whitespace-pre-wrap text-base text-text">{profile.bio}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-1.5 hover:text-gold">
                <Mail className="h-3.5 w-3.5" /> {profile.email}
              </a>
            )}
            {contact.website && (
              <a href={contact.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-gold">
                <Globe className="h-3.5 w-3.5" /> {contact.website}
              </a>
            )}
            {contact.location && (
              <span className="text-muted">{contact.location}</span>
            )}
          </div>
        </div>
      </div>

      {isSelf && (
        <div className="mt-10 border-t border-gray-dark pt-6">
          <ProfileEditor profile={profile} />
        </div>
      )}
    </div>
  )
}
