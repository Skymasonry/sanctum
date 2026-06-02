"use client"

import { useRef, useEffect } from "react"
import { Bell } from "lucide-react"
import type { TalkMessage } from "@/lib/talk"
import { cn } from "@/lib/utils"

interface MessageListProps {
  messages: TalkMessage[]
  currentUser?: string
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return date.toLocaleDateString()
}

function BotMessage({ msg }: { msg: TalkMessage }) {
  return (
    <div className="flex justify-center">
      <div className="flex max-w-[85%] items-start gap-2 rounded-lg border border-gray-dark/50 bg-black-deep/60 px-4 py-2">
        <Bell className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gold-dim" />
        <div className="min-w-0">
          <p className="text-sm text-gray-light">{msg.message}</p>
          <span className="text-[10px] text-gray">{formatTimestamp(msg.timestamp)}</span>
        </div>
      </div>
    </div>
  )
}

function MediaContent({ msg }: { msg: TalkMessage }) {
  if (!msg.file) return null
  const { id, name, mimetype } = msg.file
  const src = `/api/talk/media/${id}`

  if (mimetype.startsWith("image/")) {
    return (
      <img
        src={src}
        alt={name}
        className="max-h-64 rounded-lg object-contain"
        loading="lazy"
      />
    )
  }

  if (mimetype.startsWith("audio/")) {
    return (
      <div className="flex items-center gap-2">
        <audio controls preload="none" className="h-10 max-w-[260px]">
          <source src={src} type={mimetype} />
        </audio>
      </div>
    )
  }

  if (mimetype.startsWith("video/")) {
    return (
      <video
        controls
        preload="none"
        className="max-h-64 rounded-lg"
      >
        <source src={src} type={mimetype} />
      </video>
    )
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-guild underline"
    >
      {name}
    </a>
  )
}

export function MessageList({ messages, currentUser }: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages])

  const visibleMessages = messages.filter(
    msg =>
      (msg.messageType === "comment" && (msg.actorType === "users" || msg.actorType === "bots")) ||
      msg.messageType === "file_shared"
  )

  if (visibleMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray">The chamber awaits the first whisper...</p>
      </div>
    )
  }

  return (
    <div ref={scrollContainerRef} className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
      {visibleMessages.map((msg, i) => {
        const isBot = msg.actorType === "bots"

        if (isBot) {
          return <BotMessage key={msg.id} msg={msg} />
        }

        const isOwn = currentUser !== undefined && msg.actorId === currentUser
        const isFileShare = msg.messageType === "file_shared"
        const prevMsg = i > 0 ? visibleMessages[i - 1] : null
        const isSameAuthor = prevMsg !== null && prevMsg.actorType === "users" && prevMsg.actorId === msg.actorId
        const isCloseInTime = prevMsg !== null && (msg.timestamp - prevMsg.timestamp) < 300

        // Group consecutive messages from the same author
        const isGrouped = isSameAuthor && isCloseInTime && !isFileShare

        return (
          <div
            key={msg.id}
            className={cn(
              "flex",
              isOwn ? "justify-end" : "justify-start",
              isGrouped ? "mt-0.5" : "mt-3 first:mt-0"
            )}
          >
            <div className={cn(
              "flex max-w-[75%] gap-2.5",
              isOwn && "flex-row-reverse"
            )}>
              {/* Avatar — only for first in a group */}
              {!isOwn && (
                <div className="w-8 flex-shrink-0">
                  {!isGrouped && (
                    <img
                      src={`/api/avatar/${msg.actorId}/36`}
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                </div>
              )}

              <div className={cn("min-w-0", isOwn && "text-right")}>
                {/* Name + timestamp — only for first in a group */}
                {!isGrouped && (
                  <div className={cn(
                    "mb-1 flex items-baseline gap-2",
                    isOwn && "flex-row-reverse"
                  )}>
                    <span className={cn(
                      "text-xs font-medium",
                      isOwn ? "text-gold-dim" : "text-guild"
                    )}>
                      {msg.actorDisplayName || msg.actorId}
                    </span>
                    <span className="text-[10px] text-gray">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                )}

                {/* Bubble — media or text */}
                {isFileShare && msg.file ? (
                  <div className={cn(
                    "inline-block overflow-hidden rounded-2xl",
                    isOwn ? "rounded-tr-sm" : "rounded-tl-sm",
                    msg.file.mimetype.startsWith("audio/")
                      ? cn("px-3 py-2", isOwn ? "bg-guild/15" : "bg-black-light")
                      : "bg-black-light"
                  )}>
                    <MediaContent msg={msg} />
                  </div>
                ) : (
                  <div className={cn(
                    "inline-block rounded-2xl px-3.5 py-2 text-sm",
                    isOwn
                      ? "rounded-tr-sm bg-guild/15 text-white"
                      : "rounded-tl-sm bg-black-light text-gray-light",
                    isGrouped && isOwn && "rounded-tr-2xl",
                    isGrouped && !isOwn && "rounded-tl-2xl"
                  )}>
                    <p className="whitespace-pre-wrap break-words">
                      {msg.message.split(/(@\w+)/g).map((part, idx) =>
                        /^@\w+$/.test(part)
                          ? <span key={idx} className="font-semibold text-gold">{part}</span>
                          : part
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
