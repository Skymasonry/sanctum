"use client"

import { useState, useTransition } from "react"

import type { Scroll } from "@/lib/scrolls"
import { ContentBlocksView } from "./ContentBlocksView"
import { QuestionInput } from "./QuestionInput"

interface PublicScrollFormProps {
  scroll: Scroll
}

/**
 * The unauthenticated fill-out experience — reached before someone has
 * (or is logged into) a Sanctum account. Can't auto-join a guild here
 * (there's no account to add), so submitting just records the answers
 * against the email they enter; a seeder reviewing submissions is the
 * follow-up point for getting them an invite.
 */
export function PublicScrollForm({ scroll }: PublicScrollFormProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [manualEmail, setManualEmail] = useState("")
  const [website, setWebsite] = useState("") // honeypot
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const emailQuestion = scroll.questions.find(q => /email/i.test(q.text))
  const email = emailQuestion ? String(answers[emailQuestion.id] ?? "").trim() : manualEmail.trim()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email) {
      setError("An email address is required.")
      return
    }
    const missing = scroll.questions.some(q => {
      if (!q.required) return false
      const v = answers[q.id]
      return v === undefined || v === null || v === ""
    })
    if (missing) {
      setError("Please answer all required questions.")
      return
    }
    start(async () => {
      try {
        const res = await fetch(`/api/public/scrolls/${scroll.id}/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, answers, website }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `HTTP ${res.status}`)
        }
        setDone(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit")
      }
    })
  }

  if (done) {
    return (
      <div className="rounded-lg bg-success/10 px-4 py-4 text-sm text-success">
        Thanks — your application is in. Someone from Sky Masons will be in touch to help you
        set up your Sanctum account.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {scroll.headerImageUrl && (
        <div className="overflow-hidden rounded-lg border border-gray-dark">
          {/* eslint-disable-next-line @next/next/no-img-element -- external S3 URL */}
          <img src={scroll.headerImageUrl} alt="" className="h-48 w-full object-cover" />
        </div>
      )}

      {scroll.contentBlocks.length > 0 ? (
        <ContentBlocksView blocks={scroll.contentBlocks} />
      ) : (
        scroll.description && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-light">
            {scroll.description}
          </p>
        )
      )}

      {!emailQuestion && (
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-faint">Your email</label>
          <input
            type="email"
            value={manualEmail}
            onChange={e => setManualEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-dark bg-black-deep px-3 py-2.5 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {scroll.questions.map((q, i) => (
          <div key={q.id}>
            <label className="mb-1.5 block text-sm text-white">
              <span className="mr-2 text-faint">{i + 1}.</span>
              {q.text}
              {q.required && <span className="ml-1 text-danger">*</span>}
            </label>
            <QuestionInput
              question={q}
              answer={answers[q.id]}
              onAnswer={v => setAnswers(a => ({ ...a, [q.id]: v }))}
              disabled={false}
            />
          </div>
        ))}
      </div>

      {/* Honeypot — hidden from real applicants via CSS, not display:none
          (some bots skip display:none fields specifically). */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
        </label>
      </div>

      <div className="flex items-center gap-3 border-t border-gray-dark pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-guild px-5 py-2.5 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80 disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit application"}
        </button>
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </form>
  )
}
