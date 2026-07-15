"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { useEffect, useMemo, useState } from "react"
import * as Y from "yjs"

interface DocEditorProps {
  nodeId: string
  userLabel: string
}

const CURSOR_COLORS = [
  "#f5c05c", "#5cf5b9", "#5cbaf5", "#f55c9c", "#c9f55c", "#f5a05c",
]

function colorForUser(label: string): string {
  let h = 0
  for (let i = 0; i < label.length; i += 1) h = (h * 31 + label.charCodeAt(i)) & 0xffff
  return CURSOR_COLORS[h % CURSOR_COLORS.length]
}

export function DocEditor({ nodeId, userLabel }: DocEditorProps) {
  const ydoc = useMemo(() => new Y.Doc(), [])
  const [status, setStatus] = useState<string>("connecting")
  const [synced, setSynced] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)

  useEffect(() => {
    let cancelled = false
    let created: HocuspocusProvider | null = null

    ;(async () => {
      const res = await fetch(`/api/nodes/${nodeId}/ws-token`)
      if (!res.ok || cancelled) return
      const { token, wsUrl } = (await res.json()) as { token: string; wsUrl: string }
      if (cancelled) return

      created = new HocuspocusProvider({
        url: wsUrl,
        name: nodeId,
        document: ydoc,
        token,
        onStatus: ({ status }) => setStatus(String(status)),
        onSynced: () => setSynced(true),
        onAuthenticationFailed: ({ reason }) => setAuthError(reason || "auth failed"),
      })
      setProvider(created)
    })()

    return () => {
      cancelled = true
      created?.destroy()
    }
  }, [nodeId, ydoc])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false, gapcursor: false }),
      Collaboration.configure({ document: ydoc }),
      ...(provider
        ? [
            CollaborationCursor.configure({
              provider,
              user: { name: userLabel, color: colorForUser(userLabel) },
            }),
          ]
        : []),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none focus:outline-none min-h-full px-8 py-6 " +
          "[&_p]:my-3 [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:mt-5 [&_h2]:mb-2 " +
          "[&_.collaboration-cursor__caret]:relative [&_.collaboration-cursor__caret]:border-l-2 " +
          "[&_.collaboration-cursor__label]:absolute [&_.collaboration-cursor__label]:-top-5 " +
          "[&_.collaboration-cursor__label]:left-0 [&_.collaboration-cursor__label]:whitespace-nowrap " +
          "[&_.collaboration-cursor__label]:rounded [&_.collaboration-cursor__label]:px-1 " +
          "[&_.collaboration-cursor__label]:text-[10px] [&_.collaboration-cursor__label]:font-medium " +
          "[&_.collaboration-cursor__label]:text-black",
      },
    },
    immediatelyRender: false,
  }, [provider])

  const btn = (active: boolean) =>
    `flex h-8 min-w-8 items-center justify-center rounded px-2 text-xs transition-colors ` +
    (active
      ? "bg-guild/20 text-guild"
      : "text-gray hover:bg-white/5 hover:text-white")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-gray-dark pb-3">
        <div className="flex items-center gap-1">
          <button className={btn(editor?.isActive("bold") ?? false)} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold"><strong>B</strong></button>
          <button className={btn(editor?.isActive("italic") ?? false)} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic"><em>I</em></button>
          <button className={btn(editor?.isActive("strike") ?? false)} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Strike"><s>S</s></button>
          <span className="mx-2 h-4 w-px bg-gray-dark" />
          <button className={btn(editor?.isActive("heading", { level: 1 }) ?? false)} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
          <button className={btn(editor?.isActive("heading", { level: 2 }) ?? false)} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
          <span className="mx-2 h-4 w-px bg-gray-dark" />
          <button className={btn(editor?.isActive("bulletList") ?? false)} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet list">•</button>
          <button className={btn(editor?.isActive("orderedList") ?? false)} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Ordered list">1.</button>
          <button className={btn(editor?.isActive("blockquote") ?? false)} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Quote">&ldquo;</button>
          <button className={btn(editor?.isActive("codeBlock") ?? false)} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} title="Code">{"</>"}</button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              authError ? "bg-danger" : synced ? "bg-success"
              : status === "connected" ? "bg-gold" : "bg-gold animate-pulse"
            }`}
          />
          <span className="text-gray">
            {authError ? `auth: ${authError}` : synced ? "saved"
             : status === "connected" ? "syncing" : status}
          </span>
        </div>
      </div>

      {/* Editor scroll region */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-dark bg-black-deep">
        <div className="mx-auto max-w-3xl">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
