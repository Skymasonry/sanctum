"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Upload, Copy, Check, Pencil } from "lucide-react"

import type { Scroll, ScrollSubmission, QuestionType } from "@/lib/scrolls"
import { ContentBlocksEditor } from "./ContentBlocksEditor"
import { ContentBlocksView } from "./ContentBlocksView"
import { QuestionInput } from "./QuestionInput"

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const [editingContent, setEditingContent] = useState(false)

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

  const patchScroll = (patch: Record<string, unknown>) => {
    start(async () => {
      await fetch(`/api/scrolls/${scroll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      router.refresh()
    })
  }

  const uploadHeaderImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    start(async () => {
      try {
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch(`/api/scrolls/${scroll.id}/header-image`, { method: "POST", body: fd })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(err?.error || `HTTP ${res.status}`)
        }
        const data = (await res.json()) as { url: string }
        await fetch(`/api/scrolls/${scroll.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headerImageUrl: data.url }),
        })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to upload image")
      }
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
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/public/scrolls/${scroll.id}` : ""

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {scroll.headerImageUrl && (
        <div className="overflow-hidden rounded-lg border border-gray-dark">
          {/* eslint-disable-next-line @next/next/no-img-element -- external S3 URL, no next/image loader configured for it */}
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

      {isSeeder && (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-dark p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => patchScroll({ published: !scroll.published })}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition ${
                scroll.published
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-gray-dark text-gray hover:border-gold/40 hover:text-gold"
              }`}
            >
              {scroll.published ? "Published" : "Publish"}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-dark px-3 py-1.5 text-xs text-gray-light transition hover:border-guild/50 hover:bg-guild/10"
            >
              <Upload className="h-3.5 w-3.5" />
              {scroll.headerImageUrl ? "Replace header image" : "Add header image"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadHeaderImage} className="hidden" />
            <button
              type="button"
              onClick={() => setEditingContent(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-dark px-3 py-1.5 text-xs text-gray-light transition hover:border-guild/50 hover:bg-guild/10"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editingContent ? "Close editor" : "Design page content"}
            </button>
            <span className="font-mono text-[10px] text-faint">
              {submissions.length} submission{submissions.length === 1 ? "" : "s"}
            </span>
          </div>

          {editingContent && (
            <ContentBlocksEditor
              scrollId={scroll.id}
              initialBlocks={scroll.contentBlocks}
              onSaved={() => {
                setEditingContent(false)
                router.refresh()
              }}
            />
          )}

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-light">
            <input
              type="checkbox"
              checked={scroll.autoJoinGuild}
              onChange={e => patchScroll({ autoJoinGuild: e.target.checked })}
              className="accent-guild"
            />
            Submitting instantly joins this guild
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-light">
            <input
              type="checkbox"
              checked={scroll.publicAccess}
              onChange={e => patchScroll({ publicAccess: e.target.checked })}
              className="accent-guild"
            />
            Anyone with the link can fill this out without a Sanctum account
          </label>

          {scroll.publicAccess && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-dark bg-black-deep px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-xs text-faint">{publicUrl}</code>
              <button type="button" onClick={copyPublicUrl} className="shrink-0 text-gray hover:text-guild">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
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
            <div key={q.id} className="rounded-lg border border-gray-dark bg-black-deep/30 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <label className="text-sm text-white">
                  <span className="mr-2 text-faint">{i + 1}.</span>
                  {q.text}
                  {q.required && <span className="ml-1 text-danger">*</span>}
                </label>
                {isSeeder && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="rounded p-1 text-gray transition hover:bg-black-light hover:text-danger"
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <QuestionInput
                question={q}
                answer={answers[q.id]}
                onAnswer={v => setAnswers(a => ({ ...a, [q.id]: v }))}
                disabled={!scroll.published || alreadySubmitted}
              />
            </div>
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
              You&apos;ve submitted this scroll
              {scroll.autoJoinGuild ? " — welcome to the guild." : "."}
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
