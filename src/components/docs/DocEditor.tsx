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
      StarterKit.configure({ history: false }),
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
          "prose prose-invert max-w-none focus:outline-none min-h-[60vh] p-6 [&_.collaboration-cursor__caret]:relative [&_.collaboration-cursor__caret]:border-l-2 [&_.collaboration-cursor__label]:absolute [&_.collaboration-cursor__label]:-top-5 [&_.collaboration-cursor__label]:left-0 [&_.collaboration-cursor__label]:whitespace-nowrap [&_.collaboration-cursor__label]:rounded [&_.collaboration-cursor__label]:px-1 [&_.collaboration-cursor__label]:text-[10px] [&_.collaboration-cursor__label]:font-medium [&_.collaboration-cursor__label]:text-black",
      },
    },
    immediatelyRender: false,
  }, [provider])

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span
          className={`h-2 w-2 rounded-full ${
            authError
              ? "bg-danger"
              : synced
              ? "bg-success"
              : status === "connected"
              ? "bg-gold"
              : "bg-gold animate-pulse"
          }`}
        />
        <span className="text-gray">
          {authError
            ? `auth: ${authError}`
            : synced
            ? "saved"
            : status === "connected"
            ? "syncing"
            : status}
        </span>
      </div>
      <div className="flex-1 overflow-auto rounded-lg border border-gray-dark bg-black-deep">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
