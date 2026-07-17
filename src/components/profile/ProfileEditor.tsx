"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import type { Profile } from "@/lib/profiles"

interface ProfileEditorProps {
  profile: Profile
}

interface ContactShape {
  website?: string
  location?: string
  phone?: string
}

export function ProfileEditor({ profile }: ProfileEditorProps) {
  const router = useRouter()
  const initialContact = profile.contact as ContactShape
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio)
  const [website, setWebsite] = useState(initialContact.website ?? "")
  const [location, setLocation] = useState(initialContact.location ?? "")
  const [phone, setPhone] = useState(initialContact.phone ?? "")
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    start(async () => {
      try {
        const res = await fetch(`/api/profiles/${profile.userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim(),
            bio: bio.trim(),
            contact: { website: website.trim(), location: location.trim(), phone: phone.trim() },
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setMsg({ tone: "ok", text: "Saved" })
        router.refresh()
      } catch (e) {
        setMsg({ tone: "err", text: e instanceof Error ? e.message : "Failed to save" })
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
        Edit your profile
      </h2>
      <div>
        <label className="mb-1 block text-xs text-gray">Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray">Bio</label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray">Website</label>
          <input
            type="url"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray">Location</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition hover:bg-guild/80 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {msg && (
          <span className={`text-sm ${msg.tone === "ok" ? "text-success" : "text-danger"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  )
}
