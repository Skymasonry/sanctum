"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

import { HelpTooltip } from "@/components/shared"
import { SKYMASONS_TERMS } from "@/lib/skymasons-glossary"
import type { FromSkyToStoneAnswers } from "@/lib/event-applications"

interface FromSkyToStoneFormProps {
  userName: string
  userEmail: string
  initialAnswers: Partial<FromSkyToStoneAnswers>
  initialAgreed: boolean
  alreadySubmitted: boolean
}

const EMPTY_ANSWERS: FromSkyToStoneAnswers = {
  mobile: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postcode: "",
  birthDate: "",
  contribution: "",
  dietary: "",
  arrivingThuToSun: "",
  wantsOnlineIfCantAttend: "n/a",
  campingGearNeeds: "",
  isReturnee: "",
  returneeArrivingWed: "n/a",
  healthNotes: "",
  focus: "",
  rolesAndContributions: "",
}

const fieldLabel = "mb-1.5 block text-xs uppercase tracking-widest text-faint"
const textInput =
  "w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2.5 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className={fieldLabel}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={textInput}
      />
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  help?: { label: string; definition: string }
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label className={fieldLabel + " mb-0"}>{label}</label>
        {help && (
          <HelpTooltip label={help.label}>{help.definition}</HelpTooltip>
        )}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${textInput} resize-y`}
      />
    </div>
  )
}

function RadioGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <div>
      <label className={fieldLabel}>{label}</label>
      <div className="flex flex-col gap-2">
        {options.map(opt => (
          <label
            key={opt.value}
            className={
              "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors " +
              (value === opt.value
                ? "border-guild bg-guild/10 text-white"
                : "border-gray-dark bg-black-deep text-gray-light hover:border-guild/40")
            }
          >
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="accent-guild"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  )
}

const AGREEMENTS = [
  {
    title: "Self-Responsibility",
    body: "I'm fully accountable for my own experience, wellbeing, and choices before, during, and after the event.",
  },
  {
    title: "Mutual Respect",
    body: "I'll treat other members with respect, honour stated boundaries, and engage in good faith.",
  },
  {
    title: "Active Participation",
    body: "I understand this weekend is co-created, not a service I consume — I'll show up and contribute.",
  },
  {
    title: "Confidentiality",
    body: "What's shared in circle stays in circle. I won't repeat others' shares outside the space without permission.",
  },
  {
    title: "Financial Contribution",
    body: "I'll honour my contribution commitment above, or have raised the need for assistance in advance.",
  },
  {
    title: "Open-Mindedness",
    body: "I'm coming willing to learn, be challenged, and encounter practices or people unlike myself.",
  },
]

export function FromSkyToStoneForm({
  userName,
  userEmail,
  initialAnswers,
  initialAgreed,
  alreadySubmitted,
}: FromSkyToStoneFormProps) {
  const router = useRouter()
  const [answers, setAnswers] = useState<FromSkyToStoneAnswers>({ ...EMPTY_ANSWERS, ...initialAnswers })
  const [agreed, setAgreed] = useState(initialAgreed)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof FromSkyToStoneAnswers>(key: K, value: FromSkyToStoneAnswers[K]) =>
    setAnswers(prev => ({ ...prev, [key]: value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    if (!agreed) {
      setError("You'll need to agree to the terms below before submitting.")
      return
    }
    start(async () => {
      try {
        const res = await fetch("/api/apply/from-sky-to-stone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, agreed }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `HTTP ${res.status}`)
        }
        setSaved(true)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit")
      }
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      {/* About you — identity comes from the account, not re-asked */}
      <section>
        <h2 className="mb-3 font-display text-lg tracking-wide text-white">About you</h2>
        <p className="mb-4 text-sm text-gray">
          Applying as <span className="text-guild">{userName}</span> ({userEmail}). Not you?
          Log in with the right account before continuing.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Mobile (we use Signal)" value={answers.mobile} onChange={v => set("mobile", v)} placeholder="0400 000 000" type="tel" />
          <TextField label="Birth date" value={answers.birthDate} onChange={v => set("birthDate", v)} type="date" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Address" value={answers.addressLine1} onChange={v => set("addressLine1", v)} placeholder="Street address" />
          <TextField label="Address line 2" value={answers.addressLine2} onChange={v => set("addressLine2", v)} placeholder="Optional" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField label="City" value={answers.city} onChange={v => set("city", v)} />
          <TextField label="State" value={answers.state} onChange={v => set("state", v)} />
          <TextField label="Postcode" value={answers.postcode} onChange={v => set("postcode", v)} />
        </div>
      </section>

      {/* Event info + logistics */}
      <section>
        <h2 className="mb-1 font-display text-lg tracking-wide text-white">From Sky To Stone 2026</h2>
        <div className="mb-4 rounded-lg border border-gray-dark bg-black-deep/60 p-4 text-sm text-gray-light">
          <p className="mb-2">
            Our annual men&apos;s weekend — Koonyum Range, Bundjalung Country, Northern NSW.
          </p>
          <p className="mb-2">
            <span className="text-faint">When:</span> Thursday–Sunday, dates TBC · BYO camping
          </p>
          <p>
            <span className="text-faint">Contribution:</span> $250–$500 (sliding scale) — cash
            for the in-person weekend only. The online container has no cost.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <RadioGroup
            label="Are you prepared to contribute $250–$500 (sliding scale) to confirm your spot upon receiving an official invitation?"
            value={answers.contribution}
            onChange={v => set("contribution", v)}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "assistance", label: "I will require financial assistance" },
            ]}
          />
          <TextField label="Dietary requirements" value={answers.dietary} onChange={v => set("dietary", v)} placeholder="Allergies, preferences, etc." />
          <RadioGroup
            label="Can you commit to arriving Thursday and staying until Sunday?"
            value={answers.arrivingThuToSun}
            onChange={v => set("arrivingThuToSun", v)}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
          <RadioGroup
            label="If you're unable to attend in person, would you still like to join the online container?"
            value={answers.wantsOnlineIfCantAttend}
            onChange={v => set("wantsOnlineIfCantAttend", v)}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "n/a", label: "N/A — I'm attending in person" },
            ]}
          />
          <TextAreaField
            label="This is a BYO camping event. Any gear you'd like us to help organise?"
            value={answers.campingGearNeeds}
            onChange={v => set("campingGearNeeds", v)}
            placeholder="Especially relevant if you're flying in"
          />
          <RadioGroup
            label="Are you a returning member?"
            value={answers.isReturnee}
            onChange={v => set("isReturnee", v)}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No, first From Sky To Stone" },
            ]}
          />
          {answers.isReturnee === "yes" && (
            <RadioGroup
              label="As a returnee, can you arrive Wednesday instead?"
              value={answers.returneeArrivingWed}
              onChange={v => set("returneeArrivingWed", v)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          )}
          <TextAreaField
            label="Anything physical or mental we should be aware of?"
            value={answers.healthNotes}
            onChange={v => set("healthNotes", v)}
            placeholder="Kept confidential, seen only by the organising circle"
          />
        </div>
      </section>

      {/* Your Focus */}
      <section>
        <h2 className="mb-1 font-display text-lg tracking-wide text-white">Your Focus</h2>
        <p className="mb-3 text-sm text-gray">
          We believe everybody has an innate drive towards actualisation. What are you working
          on and moving towards? e.g. launching or growing a business, starting a community
          project, a creative work, starting/raising a family, self-development. This can
          evolve over time.
        </p>
        <TextAreaField label="Your focus" value={answers.focus} onChange={v => set("focus", v)} rows={4} />
      </section>

      {/* Roles & Contributions */}
      <section>
        <h2 className="mb-1 font-display text-lg tracking-wide text-white">Roles &amp; Contributions</h2>
        <p className="mb-3 text-sm text-gray">
          Anything you&apos;d like to offer the weekend? Movement practices, music, games,
          workshops — whatever you bring.
        </p>
        <TextAreaField label="What you'd like to offer" value={answers.rolesAndContributions} onChange={v => set("rolesAndContributions", v)} rows={4} />
      </section>

      {/* The Sky Masons Way */}
      <section>
        <h2 className="mb-1 font-display text-lg tracking-wide text-white">The Sky Masons Way</h2>
        <p className="mb-4 text-sm text-gray">
          Sky Masons is a{" "}
          <HelpTooltip label={SKYMASONS_TERMS.syntropy.label}>{SKYMASONS_TERMS.syntropy.definition}</HelpTooltip>
          {" "}syntropic culture — self-organising, non-hierarchical, and tested against one
          question: {" "}
          <HelpTooltip label={SKYMASONS_TERMS.boatGoesFaster.label}>{SKYMASONS_TERMS.boatGoesFaster.definition}</HelpTooltip>
          {" "}does it serve where we&apos;re collectively becoming? We move in{" "}
          <HelpTooltip label={SKYMASONS_TERMS.kairosTime.label}>{SKYMASONS_TERMS.kairosTime.definition}</HelpTooltip>
          {" "}— letting things unfold in their own time — without dodging what&apos;s in front of us.
        </p>

        <div className="rounded-lg border border-gray-dark bg-black-deep/60 p-4">
          <p className="mb-3 text-sm font-medium text-white">
            By participating in Sky Masons, I acknowledge and agree to the following:
          </p>
          <ol className="flex flex-col gap-3 text-sm text-gray-light">
            {AGREEMENTS.map((a, i) => (
              <li key={a.title}>
                <span className="font-medium text-guild">{i + 1}. {a.title}</span> — {a.body}
              </li>
            ))}
          </ol>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-dark bg-black-deep px-3 py-3 text-sm text-gray-light hover:border-guild/40">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 accent-guild"
          />
          I agree to the above.
        </label>
      </section>

      <div className="flex items-center gap-3 border-t border-gray-dark pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-guild px-5 py-2.5 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80 disabled:opacity-50"
        >
          {pending ? "Submitting…" : alreadySubmitted ? "Update application" : "Submit application"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </form>
  )
}
