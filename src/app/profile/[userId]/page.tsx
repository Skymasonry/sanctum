import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Globe, UserPlus } from "lucide-react"

import { ProfileEditor } from "@/components/profile/ProfileEditor"
import { getUser } from "@/lib/auth"
import { getProfile } from "@/lib/profiles"
import { fetchAccountAPI } from "@/lib/account-api"

interface ProfilePageProps {
  params: Promise<{ userId: string }>
}

interface ContactShape {
  phone?: string
  website?: string
  location?: string
  links?: Array<{ label: string; url: string }>
}

interface Referral {
  username: string
  name: string | null
  date_joined: string | null
}

async function getInvitedBy(viewerUsername: string, targetUserId: string): Promise<string | null> {
  try {
    const data = (await fetchAccountAPI(
      `/api/invite/invited-by?user=${encodeURIComponent(targetUserId)}`,
      { "X-Authentik-Username": viewerUsername },
    )) as { invited_by?: string | null }
    return data.invited_by ?? null
  } catch {
    return null
  }
}

async function getReferrals(viewerUsername: string, targetUserId: string): Promise<Referral[]> {
  try {
    const data = (await fetchAccountAPI(
      `/api/invite/referrals?user=${encodeURIComponent(targetUserId)}`,
      { "X-Authentik-Username": viewerUsername },
    )) as { referrals?: Referral[] }
    return data.referrals ?? []
  } catch {
    return []
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params
  const viewer = await getUser()
  const profile = await getProfile(userId)
  if (!profile) notFound()

  const isSelf = viewer?.username === userId
  const contact = profile.contact as ContactShape

  const [invitedBy, referrals] = viewer
    ? await Promise.all([getInvitedBy(viewer.username, userId), getReferrals(viewer.username, userId)])
    : [null, []]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="scrollbar-none mx-auto h-full w-full min-h-0 max-w-2xl flex-1 overflow-y-auto p-6 lg:p-8">
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
            {invitedBy && (
              <p className="mt-3 text-sm text-faint">
                Invited by <Link href={`/profile/${encodeURIComponent(invitedBy)}`} className="text-guild hover:underline">{invitedBy}</Link>
              </p>
            )}
          </div>
        </div>

        {referrals.length > 0 && (
          <div className="mt-8 border-t border-gray-dark pt-6">
            <h2 className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
              <UserPlus className="h-3.5 w-3.5" />
              Invited {referrals.length} {referrals.length === 1 ? "member" : "members"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {referrals.map(r => (
                <Link
                  key={r.username}
                  href={`/profile/${encodeURIComponent(r.username)}`}
                  className="rounded-full border border-gray-dark bg-black-deep px-3 py-1 text-sm text-gray-light transition hover:border-guild/50 hover:text-guild"
                >
                  {r.name || r.username}
                </Link>
              ))}
            </div>
          </div>
        )}

        {isSelf && (
          <div className="mt-10 border-t border-gray-dark pt-6">
            <ProfileEditor profile={profile} />
          </div>
        )}
      </div>
    </div>
  )
}
