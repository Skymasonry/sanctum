"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { Extension } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import TextStyle from "@tiptap/extension-text-style"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { useEffect, useMemo, useState } from "react"
import * as Y from "yjs"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
  }
}

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] as string[] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null as string | null,
            parseHTML: (el: HTMLElement) => el.style.fontSize?.replace(/['"]/g, "") || null,
            renderHTML: (attrs: Record<string, unknown>) =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "32px"]

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
      TextStyle,
      FontSize,
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
    `flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ` +
    (active
      ? "border-guild bg-guild/25 text-guild"
      : "border-gray-dark bg-white/5 text-gray-light hover:border-guild/50 hover:bg-white/10 hover:text-white")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-gray-dark pb-3">
        <div className="flex items-center gap-1">
          <button className={btn(editor?.isActive("bold") ?? false)} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold"><strong>B</strong></button>
          <button className={btn(editor?.isActive("italic") ?? false)} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic"><em>I</em></button>
          <button className={btn(editor?.isActive("strike") ?? false)} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Strike"><s>S</s></button>
          <span className="mx-1 h-6 w-px bg-gray-dark" />
          <button className={btn(editor?.isActive("heading", { level: 1 }) ?? false)} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
          <button className={btn(editor?.isActive("heading", { level: 2 }) ?? false)} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
          <span className="mx-1 h-6 w-px bg-gray-dark" />
          <button className={btn(editor?.isActive("bulletList") ?? false)} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet list">•</button>
          <button className={btn(editor?.isActive("orderedList") ?? false)} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Ordered list">1.</button>
          <button className={btn(editor?.isActive("blockquote") ?? false)} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Quote">&ldquo;</button>
          <button className={btn(editor?.isActive("codeBlock") ?? false)} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} title="Code">{"</>"}</button>
          <span className="mx-1 h-6 w-px bg-gray-dark" />
          <select
            defaultValue=""
            onChange={e => {
              const v = e.target.value
              if (v === "" || v === "__unset") editor?.chain().focus().unsetFontSize().run()
              else editor?.chain().focus().setFontSize(v).run()
              e.target.value = ""
            }}
            style={{ colorScheme: "dark" }}
            className="h-10 rounded-md border border-gray-dark bg-white/5 px-3 text-sm font-medium text-gray-light hover:border-guild/50 hover:bg-white/10 hover:text-white focus:outline-none"
            title="Font size"
          >
            <option value="" className="bg-black-light text-gray-light">Size</option>
            {FONT_SIZES.map(s => (
              <option key={s} value={s} className="bg-black-light text-gray-light">{s.replace("px", "")}</option>
            ))}
            <option value="__unset" className="bg-black-light text-gray-light">Reset</option>
          </select>
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

      {/* Editor scroll region — explicit inset box so top+bottom borders are always visible */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-y-auto rounded-lg border-2 border-guild/40 bg-black-deep">
          <div className="mx-auto max-w-3xl py-4">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  )
}
