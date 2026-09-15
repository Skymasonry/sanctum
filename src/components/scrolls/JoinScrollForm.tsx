"use client"

import { useState, useTransition } from "react"

import type { Scroll } from "@/lib/scrolls"
import { ContentBlocksView } from "./ContentBlocksView"
import { QuestionInput } from "./QuestionInput"

interface JoinScrollFormProps {
  scroll: Scroll
  currentUser: string
}

/**
 * Authenticated fill-out experience — reached via /join by a Sky Mason who
 * already has a Sanctum account. The submission is tied to their username
 * (not an email they type), and on success they're immediately added to
 * The Brotherhood + From Sky To Stone guilds.
 */
export function JoinScrollForm({ scroll, currentUser }: JoinScrollFormProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

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
        const res = await fetch(`/api/scrolls/${scroll.id}/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
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
      <div className="rounded-lg bg-success/10 px-4 py-6 text-sm text-success">
        <p className="font-medium">Welcome, brother.</p>
        <p className="mt-1">
          Your application is in — you&apos;ve been added to From Sky To Stone and The Brotherhood.
          Head to the sidebar to access your guilds.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <p className="text-xs text-faint">
        Submitting as <span className="text-white">{currentUser}</span>
      </p>

      {scroll.headerImageUrl && (
        <div className="overflow-hidden rounded-lg border border-gray-dark">
          {/* eslint-disable-next-line @next/next/no-img-element -- external S3 URL */}
          <img src={scroll.headerImageUrl} alt="" className="h-72 w-full object-cover" />
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
