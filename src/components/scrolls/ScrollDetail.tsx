"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

import type { Scroll, ScrollQuestion, ScrollSubmission, QuestionType } from "@/lib/scrolls"

interface Props {
  scroll: Scroll
  submissions: ScrollSubmission[]
  isSeeder: boolean
  currentUser: string
}

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: "short", label: "Short text" },
  { value: "long", label: "Long text" },
  { value: "radio", label: "Single choice" },
  { value: "checkbox", label: "Multi choice" },
  { value: "select", label: "Dropdown" },
  { value: "date", label: "Date" },
]

export function ScrollDetail({ scroll, submissions, isSeeder, currentUser }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [submitOK, setSubmitOK] = useState(false)

  // Seeder-only question builder state
  const [newQ, setNewQ] = useState("")
  const [newType, setNewType] = useState<QuestionType>("short")
  const [newOptions, setNewOptions] = useState("")
  const [newRequired, setNewRequired] = useState(false)

  const addQuestion = () => {
    if (!newQ.trim()) return
    setError(null)
    start(async () => {
      try {
        const res = await fetch(`/api/scrolls/${scroll.id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: newQ.trim(),
            type: newType,
            required: newRequired,
            options: ["radio", "checkbox", "select"].includes(newType)
              ? newOptions.split("\n").map(s => s.trim()).filter(Boolean)
              : [],
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setNewQ("")
        setNewOptions("")
        setNewRequired(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed")
      }
    })
  }

  const removeQuestion = (qid: string) => {
    start(async () => {
      const res = await fetch(`/api/questions/${qid}`, { method: "DELETE" })
      if (res.ok) router.refresh()
    })
  }

  const togglePublished = () => {
    start(async () => {
      await fetch(`/api/scrolls/${scroll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !scroll.published }),
      })
      router.refresh()
    })
  }

  const submit = () => {
    setError(null)
    start(async () => {
      try {
        const res = await fetch(`/api/scrolls/${scroll.id}/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setSubmitOK(true)
        setAnswers({})
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit")
      }
    })
  }

  const alreadySubmitted = submissions.some(s => s.submittedBy === currentUser)

  return (
    <div className="flex flex-1 flex-col gap-6">
      {isSeeder && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePublished}
            className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition ${
              scroll.published
                ? "border-success/40 bg-success/10 text-success"
                : "border-gray-dark text-gray hover:border-gold/40 hover:text-gold"
            }`}
          >
            {scroll.published ? "Published" : "Publish"}
          </button>
          <span className="font-mono text-[10px] text-faint">
            {submissions.length} submission{submissions.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Question list — read-only for members, editable for seeder */}
      {scroll.questions.length === 0 ? (
        <p className="text-sm italic text-faint">
          {isSeeder ? "No questions yet. Add one below." : "This scroll has no questions yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {scroll.questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              question={q}
              index={i}
              answer={answers[q.id]}
              onAnswer={v => setAnswers(a => ({ ...a, [q.id]: v }))}
              onRemove={isSeeder ? () => removeQuestion(q.id) : undefined}
              disabled={!scroll.published || alreadySubmitted}
            />
          ))}
        </div>
      )}

      {isSeeder && (
        <div className="mt-2 rounded-lg border border-gray-dark p-4">
          <div className="mb-3 font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
            Add a question
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={newQ}
              onChange={e => setNewQ(e.target.value)}
              placeholder="Question text…"
              className="rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as QuestionType)}
                className="rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white focus:border-guild focus:outline-none"
              >
                {QUESTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray">
                <input type="checkbox" checked={newRequired} onChange={e => setNewRequired(e.target.checked)} />
                Required
              </label>
            </div>
            {["radio", "checkbox", "select"].includes(newType) && (
              <textarea
                value={newOptions}
                onChange={e => setNewOptions(e.target.value)}
                placeholder="Options (one per line)"
                rows={3}
                className="resize-y rounded-lg border border-gray-dark bg-black-deep px-3 py-2 text-sm text-white placeholder-gray focus:border-guild focus:outline-none"
              />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addQuestion}
                disabled={!newQ.trim() || pending}
                className="inline-flex items-center gap-2 rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition hover:bg-guild/80 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {pending ? "Adding…" : "Add question"}
              </button>
              {error && <span className="text-sm text-danger">{error}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Submit button — visible to members if published + not already submitted */}
      {scroll.published && !isSeeder && scroll.questions.length > 0 && (
        <div className="mt-2">
          {alreadySubmitted || submitOK ? (
            <p className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
              You&apos;ve submitted this scroll.
            </p>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition hover:bg-guild/80 disabled:opacity-50"
            >
              {pending ? "Submitting…" : "Submit"}
            </button>
          )}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}
    </div>
  )
}

function QuestionRow({
  question,
  index,
  answer,
  onAnswer,
  onRemove,
  disabled,
}: {
  question: ScrollQuestion
  index: number
  answer: unknown
  onAnswer: (v: unknown) => void
  onRemove?: () => void
  disabled: boolean
}) {
  const label = (
    <div className="mb-2 flex items-start justify-between gap-2">
      <label className="text-sm text-white">
        <span className="mr-2 text-faint">{index + 1}.</span>
        {question.text}
        {question.required && <span className="ml-1 text-danger">*</span>}
      </label>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-gray transition hover:bg-black-light hover:text-danger"
          aria-label="Remove question"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )

  return (
    <div className="rounded-lg border border-gray-dark bg-black-deep/30 p-3">
      {label}
      {question.type === "short" && (
        <input
          type="text"
          value={(answer as string) ?? ""}
          onChange={e => onAnswer(e.target.value)}
          disabled={disabled}
          className="w-full rounded border border-gray-dark bg-black-deep px-2 py-1.5 text-sm text-white focus:border-guild focus:outline-none disabled:opacity-50"
        />
      )}
      {question.type === "long" && (
        <textarea
          value={(answer as string) ?? ""}
          onChange={e => onAnswer(e.target.value)}
          disabled={disabled}
          rows={4}
          className="w-full resize-y rounded border border-gray-dark bg-black-deep px-2 py-1.5 text-sm text-white focus:border-guild focus:outline-none disabled:opacity-50"
        />
      )}
      {question.type === "date" && (
        <input
          type="date"
          value={(answer as string) ?? ""}
          onChange={e => onAnswer(e.target.value)}
          disabled={disabled}
          className="rounded border border-gray-dark bg-black-deep px-2 py-1.5 text-sm text-white focus:border-guild focus:outline-none disabled:opacity-50"
        />
      )}
      {question.type === "radio" && question.options.map(opt => (
        <label key={opt} className="flex items-center gap-2 py-1 text-sm text-white">
          <input
            type="radio"
            name={question.id}
            value={opt}
            checked={answer === opt}
            onChange={() => onAnswer(opt)}
            disabled={disabled}
          />
          {opt}
        </label>
      ))}
      {question.type === "select" && (
        <select
          value={(answer as string) ?? ""}
          onChange={e => onAnswer(e.target.value)}
          disabled={disabled}
          className="rounded border border-gray-dark bg-black-deep px-2 py-1.5 text-sm text-white focus:border-guild focus:outline-none disabled:opacity-50"
        >
          <option value="">—</option>
          {question.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {question.type === "checkbox" && question.options.map(opt => {
        const list = Array.isArray(answer) ? (answer as string[]) : []
        return (
          <label key={opt} className="flex items-center gap-2 py-1 text-sm text-white">
            <input
              type="checkbox"
              checked={list.includes(opt)}
              onChange={e => {
                const next = e.target.checked ? [...list, opt] : list.filter(o => o !== opt)
                onAnswer(next)
              }}
              disabled={disabled}
            />
            {opt}
          </label>
        )
      })}
    </div>
  )
}
