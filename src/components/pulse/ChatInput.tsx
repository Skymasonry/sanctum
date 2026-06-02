"use client"

import { useState, useRef, useTransition } from "react"
import { Send, Image, Mic, MicOff, Video, Loader2, AtSign } from "lucide-react"
import { sendMessage } from "@/app/guild/[guildId]/pulse/actions"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  guildId: string
  token: string
  members?: string[]
}

export function ChatInput({ guildId, token, members = [] }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

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

  function submitMessage() {
    if (!message.trim() || isPending) return
    const current = message
    setMessage("")
    setMentionQuery(null)
    startTransition(async () => { await sendMessage(guildId, token, current) })
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); submitMessage() }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const resp = await fetch(`/api/talk/${token}/upload`, { method: "POST", body: formData })
      if (!resp.ok) console.error("Upload failed:", await resp.json().catch(() => ({})))
    } catch (err) {
      console.error("Upload error:", err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (accept: string) => {
    const input = accept.startsWith("video") ? videoInputRef.current : fileInputRef.current
    if (input) { input.accept = accept; input.click() }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { await uploadFile(file); e.target.value = "" }
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
        await uploadFile(new File([blob], `voice-${ts}.${format.ext}`, { type: format.type }))
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

        <button type="submit" disabled={busy || !message.trim()}
          className="flex items-center gap-2 rounded-lg bg-guild px-4 py-2 font-medium text-black transition-colors hover:bg-guild/80 disabled:opacity-50">
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">{isPending ? "Sending..." : "Send"}</span>
        </button>
      </form>
    </div>
  )
}
