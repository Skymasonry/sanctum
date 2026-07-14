"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Archive, ChevronLeft, Download, FileSpreadsheet, FileText, Film,
  Folder, FolderPlus, Image, MoreVertical, Music, Presentation,
  Trash2, Upload, X, Check,
} from "lucide-react"

import { Card, CardTitle, ChamberHeader, EmptyState } from "@/components/shared"
import { formatFileSize, type FileNode } from "@/lib/files-shared"

interface ArchiveBrowserProps {
  guildId: string
  guildName: string
}

interface Crumb {
  id: string | null
  name: string
}

const ROOT_CRUMB: Crumb = { id: null, name: "Archive" }

function fileIcon(node: FileNode) {
  if (node.isFolder) return <Folder className="h-5 w-5 text-guild" />
  const mime = node.mime ?? ""
  if (mime.startsWith("image/")) return <Image className="h-5 w-5 text-gray" />
  if (mime.startsWith("video/")) return <Film className="h-5 w-5 text-gray" />
  if (mime.startsWith("audio/")) return <Music className="h-5 w-5 text-gray" />
  if (mime.includes("spreadsheet") || mime.includes("excel")) return <FileSpreadsheet className="h-5 w-5 text-gray" />
  if (mime.includes("presentation") || mime.includes("powerpoint")) return <Presentation className="h-5 w-5 text-gray" />
  return <FileText className="h-5 w-5 text-gray" />
}

function FileRow({
  node,
  onFolderClick,
  onDelete,
}: {
  node: FileNode
  onFolderClick: (n: FileNode) => void
  onDelete: (n: FileNode) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const modified = new Date(node.updatedAt).toLocaleDateString("en-AU", {
    month: "short", day: "numeric", year: "numeric",
  })
  const sizeStr = formatFileSize(node.sizeBytes)
  const downloadUrl = `/api/nodes/${node.id}/download`

  return (
    <Card>
      <div className="flex items-center gap-4">
        {node.isFolder ? (
          <button
            onClick={() => onFolderClick(node)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-guild/10"
          >
            {fileIcon(node)}
          </button>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
            {fileIcon(node)}
          </div>
        )}
        <div
          className={`min-w-0 flex-1 ${node.isFolder ? "cursor-pointer" : ""}`}
          onClick={node.isFolder ? () => onFolderClick(node) : undefined}
        >
          <CardTitle className="truncate">{node.name}</CardTitle>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray">
            <span>{modified}</span>
            {sizeStr && <span>{sizeStr}</span>}
          </div>
        </div>
        <div className="relative flex items-center gap-1">
          {!node.isFolder && (
            <>
              {node.mime?.startsWith("image/") && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray transition-all hover:bg-guild/10 hover:text-guild"
                  title="View"
                >
                  <Image className="h-4 w-4" />
                </a>
              )}
              <a
                href={downloadUrl}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray transition-all hover:bg-guild/10 hover:text-guild"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
            </>
          )}
          <button
            onClick={() => setShowActions(v => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray transition-all hover:bg-white/10 hover:text-white"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showActions && (
            <div className="absolute right-0 top-10 z-10 min-w-[160px] rounded-lg border border-gray-dark bg-black-light py-1 shadow-xl">
              <button
                onClick={() => { onDelete(node); setShowActions(false) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-light transition-colors hover:bg-white/5 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function ArchiveBrowser({ guildId, guildName }: ArchiveBrowserProps) {
  const [path, setPath] = useState<Crumb[]>([ROOT_CRUMB])
  const currentId = path[path.length - 1].id
  const [nodes, setNodes] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<FileNode | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = currentId ? `?parent=${encodeURIComponent(currentId)}` : ""
      const res = await fetch(`/api/guilds/${guildId}/files${q}`)
      const data = await res.json()
      setNodes(Array.isArray(data.children) ? data.children : [])
    } catch {
      setNodes([])
    } finally {
      setLoading(false)
    }
  }, [guildId, currentId])

  useEffect(() => { load() }, [load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setActionError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      if (currentId) form.append("parentId", currentId)
      const res = await fetch(`/api/guilds/${guildId}/files`, { method: "POST", body: form })
      if (!res.ok) throw new Error("Upload failed")
      await load()
    } catch {
      setUploadError("Failed to upload file")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    setCreatingFolder(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/guilds/${guildId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderName: name, parentId: currentId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create folder")
      }
      setNewFolderName("")
      setShowNewFolder(false)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create folder")
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/nodes/${deleteConfirm.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteConfirm(null)
      await load()
    } catch {
      setActionError("Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  const handleFolderClick = (n: FileNode) => {
    setPath(p => [...p, { id: n.id, name: n.name }])
  }

  const handleBack = () => {
    setPath(p => (p.length > 1 ? p.slice(0, -1) : p))
  }

  return (
    <div className="flex h-full flex-col p-6 lg:p-8">
      <ChamberHeader
        backHref={`/guild/${guildId}`}
        icon={<Archive className="h-10 w-10 text-guild" />}
        title="Archive"
        subtitle={`Shared knowledge of ${guildName}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading..." : "Upload File"}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        <button
          onClick={() => { setShowNewFolder(v => !v); setNewFolderName("") }}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-dark px-4 py-2 text-sm text-gray transition-colors hover:border-guild/50 hover:text-guild"
        >
          <FolderPlus className="h-4 w-4" />
          New Folder
        </button>
        {uploadError && <span className="text-xs text-danger">{uploadError}</span>}
      </div>

      {showNewFolder && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") handleCreateFolder()
              if (e.key === "Escape") setShowNewFolder(false)
            }}
            placeholder="Folder name..."
            autoFocus
            className="rounded-lg border border-gray-dark bg-black-light px-3 py-2 text-sm text-white placeholder:text-gray focus:border-guild focus:outline-none"
          />
          <button
            onClick={handleCreateFolder}
            disabled={creatingFolder || !newFolderName.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-guild text-black-deep transition-colors hover:bg-guild/80 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowNewFolder(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-dark text-gray transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && <div className="mb-4 text-sm text-danger">{actionError}</div>}

      {deleteConfirm && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
          <Trash2 className="h-4 w-4 text-danger" />
          <span className="flex-1 text-sm text-white">
            Delete <strong>{deleteConfirm.name}</strong>
            {deleteConfirm.isFolder ? " and all its contents" : ""}?
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-danger/80 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button
            onClick={() => setDeleteConfirm(null)}
            className="rounded-lg border border-gray-dark px-3 py-1.5 text-xs text-gray transition-colors hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {path.length > 1 && (
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-1.5 text-sm text-gray transition-colors hover:text-guild"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{path[path.length - 2].name}</span>
        </button>
      )}

      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray">Loading...</div>
        ) : nodes.length === 0 ? (
          <EmptyState message="This folder is empty." />
        ) : (
          <div className="space-y-3">
            {nodes.map(node => (
              <FileRow
                key={node.id}
                node={node}
                onFolderClick={handleFolderClick}
                onDelete={n => setDeleteConfirm(n)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
