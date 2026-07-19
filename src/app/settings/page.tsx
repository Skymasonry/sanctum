"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft, Settings, User, UserPlus, Copy, Check, Trash2, X, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UserInfo {
  username: string
  name?: string
  email?: string
}

interface Referral {
  username: string
  name?: string
  date_joined: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [invitedBy, setInvitedBy] = useState<string | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [referralCount, setReferralCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/userinfo").then(r => r.json()).then(setUser).catch(() => {})
    fetch("/api/invite").then(r => r.json()).then(d => setInviteLink(d.invite_url || null)).catch(() => {})
    fetch("/api/invite/invited-by").then(r => r.json()).then(d => setInvitedBy(d.invited_by || null)).catch(() => {})
    fetch("/api/invite/referrals").then(r => r.json()).then(d => {
      setReferrals(d.referrals || [])
      setReferralCount(d.count || 0)
    }).catch(() => {})
  }, [])

  const handleCopy = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    if (!user || confirmText !== user.username) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_username: confirmText }),
      })
      if (res.ok) {
        window.location.href = "https://auth.skymasons.xyz/if/flow/sanctum-logout/"
      } else {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete account")
      }
    } catch (err: any) {
      setError(err.message)
      setDeleting(false)
    }
  }

  return (
    <div className="glass flex h-full flex-col overflow-hidden" style={{ borderRadius: 'var(--panel-radius)' }}>
    <div className="flex h-full flex-col overflow-y-auto scrollbar-none p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1 text-sm text-gray transition-colors hover:text-gold"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
            {user ? (
              <img
                src={`/api/avatar/${user.username}/48`}
                alt={user.username}
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <Settings className="h-6 w-6 text-gold" />
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-wide text-white">
              {user?.name || user?.username || "Settings"}
            </h1>
            {user?.username && (
              <p className="mt-0.5 text-sm text-gray">@{user.username}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Profile Section */}
        <section className="rounded-lg border border-gray-dark bg-black-light">
          <div className="border-b border-gray-dark px-5 py-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-gold">
              <User className="h-4 w-4" />
              Profile
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Edit Profile</h3>
                <p className="mt-0.5 text-xs text-gray">Change your display name, avatar, and contact information</p>
              </div>
              <a
                href="https://brothers.skymasons.xyz/settings/user"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-gold/30 bg-gold/10 px-4 py-2 font-display text-xs font-medium tracking-wide text-gold transition-colors hover:bg-gold/20"
              >
                Edit Profile
              </a>
            </div>
          </div>
        </section>

        {/* Invitations Section */}
        <section className="rounded-lg border border-gray-dark bg-black-light">
          <div className="border-b border-gray-dark px-5 py-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-gold">
              <UserPlus className="h-4 w-4" />
              Invitations
            </h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Invite Link */}
            <div>
              <h3 className="text-sm font-medium text-white">Your Personal Invite Link</h3>
              <p className="mt-0.5 text-xs text-gray">Share this link to invite others to join. You'll be credited as their sponsor.</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink || "Loading..."}
                  className="min-w-0 flex-1 rounded-md border border-gray-dark bg-black-deep px-3 py-2 font-mono text-xs text-gold"
                />
                <button
                  onClick={handleCopy}
                  disabled={!inviteLink}
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors",
                    copied ? "bg-success/20 text-success" : "bg-gold/10 text-gold hover:bg-gold/20"
                  )}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              {invitedBy && (
                <p className="mt-3 rounded-md border border-gray-dark bg-black-deep px-3 py-2 text-xs text-gray">
                  You were invited by <span className="text-gold">{invitedBy}</span>
                </p>
              )}
            </div>

            {/* Referrals */}
            <div>
              <h3 className="text-sm font-medium text-white">Your Referrals</h3>
              <p className="mt-0.5 text-xs text-gray">Members who joined through your invitation</p>
              {referralCount > 0 && (
                <p className="mt-2 text-xs text-gold">
                  {referralCount} {referralCount === 1 ? "person has" : "people have"} joined through your link
                </p>
              )}
              <div className="mt-3 space-y-2">
                {referrals.length === 0 ? (
                  <p className="py-4 text-center text-xs italic text-gray">
                    No one has joined through your link yet.
                  </p>
                ) : (
                  referrals.map((ref) => (
                    <div
                      key={ref.username}
                      className="flex items-center justify-between rounded-md border border-gray-dark bg-black-deep px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`/api/avatar/${ref.username}/24`}
                          alt={ref.username}
                          className="h-6 w-6 rounded-full"
                        />
                        <span className="text-sm text-white">{ref.name || ref.username}</span>
                        {ref.name && (
                          <span className="text-xs text-gray">@{ref.username}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray">
                        {new Date(ref.date_joined).toLocaleDateString("en-AU", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="rounded-lg border border-danger/30 bg-black-light">
          <div className="border-b border-danger/20 px-5 py-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-danger">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </h2>
          </div>
          <div className="p-5">
            {error && (
              <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Delete Account</h3>
                <p className="mt-0.5 text-xs text-gray">Permanently remove your account and all data. This cannot be undone.</p>
              </div>
              <button
                onClick={() => setDeleteModal(true)}
                className="rounded-md border border-danger/30 bg-danger/10 px-4 py-2 font-display text-xs font-medium tracking-wide text-danger transition-colors hover:bg-danger/20"
              >
                Delete Account
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Delete Modal */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setDeleteModal(false)}
        >
          <div className="w-full max-w-md rounded-lg border border-danger/40 bg-black-deep p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold tracking-wide text-danger">
                Delete Your Account
              </h2>
              <button onClick={() => setDeleteModal(false)} className="text-gray hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray">
              This action is <span className="text-danger font-medium">permanent and irreversible</span>.
              Your account, profile, and membership in all guilds will be permanently removed.
            </p>
            <p className="mb-3 text-sm text-gray">
              To confirm, type your username: <span className="font-medium text-danger">{user?.username}</span>
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter your username"
              className="mb-4 w-full rounded-md border border-danger/30 bg-black px-3 py-2 text-sm text-white placeholder:text-gray-dark focus:border-danger focus:outline-none"
              autoComplete="off"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="rounded-md border border-gray-dark px-4 py-2 text-xs text-gray transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== user?.username || deleting}
                className="rounded-md bg-danger px-4 py-2 text-xs font-medium text-white transition-opacity disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
