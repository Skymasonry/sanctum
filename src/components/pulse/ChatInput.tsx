"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send, Image, Mic, MicOff, Video, Loader2, AtSign, X } from "lucide-react"
import { sendMessage } from "@/app/guild/[guildId]/pulse/actions"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  guildId: string
  token: string
  members?: string[]
}

export function ChatInput({ guildId, token, members = [] }: ChatInputProps) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Staged attachment: file picked but not yet sent. Sending happens on
  // Send-button click so the user can add a caption alongside the file.
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [stagedPreview, setStagedPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!stagedFile) { setStagedPreview(null); return }
    if (stagedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(stagedFile)
      setStagedPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setStagedPreview(null)
  }, [stagedFile])

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const mentionAnchorRef = useRef<number>(-1)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const mentionMatches = mentionQuery !== null
    ? members.filter((m) => m.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, 6)
    : []

  function handleInput(value: string) {
    setMessage(value)
    const cursor = inputRef.current?.selectionStart ?? value.length
    const textUpToCursor = value.slice(0, cursor)
    const atIndex = textUpToCursor.lastIndexOf("@")
    if (atIndex !== -1) {
      const fragment = textUpToCursor.slice(atIndex + 1)
      if (!fragment.includes(" ")) {
        mentionAnchorRef.current = atIndex
        setMentionQuery(fragment)
        setMentionIndex(0)
        return
      }
    }
    setMentionQuery(null)
  }

  function insertMention(username: string) {
    const anchor = mentionAnchorRef.current
    if (anchor === -1) return
    const before = message.slice(0, anchor)
    const after = message.slice(anchor + 1 + (mentionQuery?.length ?? 0))
    setMessage(`${before}@${username} ${after}`)
    setMentionQuery(null)
    mentionAnchorRef.current = -1
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionMatches.length); return }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length); return }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentionMatches[mentionIndex]); return }
      if (e.key === "Escape") { setMentionQuery(null); return }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMessage() }
  }

  // Upload a file to the Talk room. Kept for voice recordings which send
  // straight through without a preview step.
  const uploadFileImmediate = async (file: File) => {
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const resp = await fetch(`/api/talk/${token}/upload`, { method: "POST", body: formData })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string }
        setError(err.error || "Upload failed")
        return false
      }
      router.refresh()
      return true
    } catch {
      setError("Upload failed")
      return false
    } finally {
      setIsUploading(false)
    }
  }

  async function submitMessage() {
    const text = message.trim()
    const file = stagedFile
    if (!text && !file) return
    if (isPending || isUploading) return

    setMessage("")
    setMentionQuery(null)

    // File first (if any). Talk doesn't support attaching a caption to
    // a file share in one message, so the caption goes as a follow-up
    // text message immediately after.
    if (file) {
      const ok = await uploadFileImmediate(file)
      setStagedFile(null)
      if (!ok) return
    }

    if (text) {
      startTransition(async () => { await sendMessage(guildId, token, text) })
    }
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); submitMessage() }

  const handleFileSelect = (accept: string) => {
    const input = accept.startsWith("video") ? videoInputRef.current : fileInputRef.current
    if (input) { input.accept = accept; input.click() }
  }

  // File picker stages the file; user hits Send to actually upload.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setStagedFile(file)
      setError(null)
    }
    e.target.value = ""
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const formats = [
        { mime: "audio/webm;codecs=opus", ext: "webm", type: "audio/webm" },
        { mime: "audio/webm", ext: "webm", type: "audio/webm" },
        { mime: "audio/mp4", ext: "m4a", type: "audio/mp4" },
        { mime: "audio/ogg;codecs=opus", ext: "ogg", type: "audio/ogg" },
        { mime: "", ext: "wav", type: "audio/wav" },
      ]
      const format = formats.find((f) => f.mime === "" || MediaRecorder.isTypeSupported(f.mime))
      if (!format) { stream.getTracks().forEach((t) => t.stop()); setError("Voice recording not supported"); return }
      const recorder = new MediaRecorder(stream, format.mime ? { mimeType: format.mime } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)
        setRecordingDuration(0)
        const blob = new Blob(chunksRef.current, { type: format.type })
        const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")
        await uploadFileImmediate(new File([blob], `voice-${ts}.${format.ext}`, { type: format.type }))
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setRecordingDuration(0)
      timerRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000)
    } catch {
      setError("Microphone access denied")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") { mediaRecorderRef.current.stop(); setIsRecording(false) }
  }

  const formatDuration = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
  const busy = isPending || isUploading

  return (
    <div className="relative border-t border-gray-dark p-4">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      <input ref={videoInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* @mention dropdown */}
      {mentionQuery !== null && mentionMatches.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-1 overflow-hidden rounded-lg border border-gray-dark bg-black shadow-xl">
          {mentionMatches.map((username, i) => (
            <button
              key={username}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(username) }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                i === mentionIndex ? "bg-black-light text-white" : "text-gray hover:bg-black-light hover:text-white"
              )}
            >
              <img src={`/api/avatar/${username}/24`} alt="" className="h-5 w-5 rounded-full" />
              <span>@{username}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-center gap-2 text-sm text-danger">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-gray hover:text-white">&times;</button>
        </div>
      )}

      {isRecording && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
          <span className="text-danger">Recording {formatDuration(recordingDuration)}</span>
        </div>
      )}

      {isUploading && (
        <div className="mb-3 flex items-center gap-2 text-sm text-gray">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading...</span>
        </div>
      )}

      {stagedFile && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-guild/30 bg-guild/[0.06] px-3 py-2">
          {stagedPreview ? (
            <img src={stagedPreview} alt="" className="h-14 w-14 flex-shrink-0 rounded object-cover" />
          ) : (
            <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded bg-black-light text-guild">
              <Video className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-white">{stagedFile.name}</div>
            <div className="font-mono text-[10px] text-faint">
              {Math.round(stagedFile.size / 1024)} KB · attach on send
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStagedFile(null)}
            className="rounded p-1 text-gray transition hover:bg-black-light hover:text-white"
            aria-label="Remove attachment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => handleFileSelect("image/*")} disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray transition-colors hover:bg-black-light hover:text-gold disabled:opacity-50" title="Share image">
            <Image className="h-4 w-4" />
          </button>

          <button type="button" onClick={isRecording ? stopRecording : startRecording} disabled={isUploading}
            className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-50",
              isRecording ? "bg-danger/20 text-danger hover:bg-danger/30" : "text-gray hover:bg-black-light hover:text-gold")}
            title={isRecording ? "Stop recording" : "Record voice"}>
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <button type="button" onClick={() => handleFileSelect("video/*")} disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray transition-colors hover:bg-black-light hover:text-gold disabled:opacity-50" title="Share video">
            <Video className="h-4 w-4" />
          </button>

          {members.length > 0 && (
            <button type="button" disabled={busy}
              onClick={() => {
                const pos = inputRef.current?.selectionStart ?? message.length
                const newMsg = message.slice(0, pos) + "@" + message.slice(pos)
                setMessage(newMsg)
                setTimeout(() => {
                  if (inputRef.current) {
                    inputRef.current.focus()
                    inputRef.current.setSelectionRange(pos + 1, pos + 1)
                    handleInput(newMsg)
                  }
                }, 0)
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray transition-colors hover:bg-black-light hover:text-gold disabled:opacity-50"
              title="Tag a member">
              <AtSign className="h-4 w-4" />
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Speak into the void..."
          disabled={busy}
          className="flex-1 rounded-lg border border-gray-dark bg-black-light px-4 py-2 text-white placeholder:text-gray transition-colors focus:border-guild focus:outline-none disabled:opacity-50"
        />

        <button type="submit" disabled={busy || (!message.trim() && !stagedFile)}
          className="flex items-center gap-2 rounded-lg bg-guild px-4 py-2 font-medium text-black transition-colors hover:bg-guild/80 disabled:opacity-50">
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">{isPending ? "Sending..." : "Send"}</span>
        </button>
      </form>
    </div>
  )
}
