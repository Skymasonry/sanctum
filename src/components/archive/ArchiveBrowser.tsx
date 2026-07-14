"use client"

import { useState, useEffect, useCallback } from "react"
import { ChamberHeader, EmptyState, Card, CardTitle } from "@/components/shared"
import {
  Archive, Folder, FileText, Image, Film, Music, FileSpreadsheet,
  Presentation, Download, ChevronLeft, Upload, Plus, Trash2, Share2,
  Link, FolderPlus, MoreVertical, X, Check, Copy
} from "lucide-react"
import type { FileNode, FolderListing } from "@/lib/files-shared"
import { formatFileSize } from "@/lib/files-shared"

interface ArchiveBrowserProps {
  guildId: string
  guildName: string
  folderId?: number
}

function getFileIcon(mime: string | undefined, type: string) {
  if (type === "folder") return <Folder className="h-5 w-5 text-guild" />
  if (!mime) return <FileText className="h-5 w-5 text-gray" />
  if (mime.startsWith("image/")) return <Image className="h-5 w-5 text-gray" />
  if (mime.startsWith("video/")) return <Film className="h-5 w-5 text-gray" />
  if (mime.startsWith("audio/")) return <Music className="h-5 w-5 text-gray" />
  if (mime.includes("spreadsheet") || mime.includes("excel")) return <FileSpreadsheet className="h-5 w-5 text-gray" />
  if (mime.includes("presentation") || mime.includes("powerpoint")) return <Presentation className="h-5 w-5 text-gray" />
  return <FileText className="h-5 w-5 text-gray" />
}

function FileRow({
  file,
  onFolderClick,
  onDelete,
  onShare,
}: {
  file: FileNode
  onFolderClick: (id: number, name: string) => void
  onDelete: (id: number, name: string, type: string) => void
  onShare: (id: number, name: string) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const icon = getFileIcon(file.mime, file.type)
  const modified = new Date(file.modified * 1000).toLocaleDateString("en-AU", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const sizeStr = formatFileSize(file.size)

  return (
    <Card>
      <div className="flex items-center gap-4">
        {file.type === "folder" ? (
          <button
            onClick={() => onFolderClick(file.id, file.name)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-guild/10"
          >
            {icon}
          </button>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
            {icon}
          </div>
        )}
        <div
          className={`min-w-0 flex-1 ${file.type === "folder" ? "cursor-pointer" : ""}`}
          onClick={file.type === "folder" ? () => onFolderClick(file.id, file.name) : undefined}
        >
          <CardTitle className="truncate">{file.name}</CardTitle>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray">
            <span>{modified}</span>
            {sizeStr && <span>{sizeStr}</span>}
          </div>
        </div>
        <div className="relative flex items-center gap-1">
          {file.type === "file" && (
            <>
              {file.mime?.startsWith("image/") && (
                <a
                  href={`/api/talk/media/${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray transition-all hover:bg-guild/10 hover:text-guild"
                  title="View"
                >
                  <Image className="h-4 w-4" />
                </a>
              )}
              <a
                href={`/api/talk/media/${file.id}`}
                download={file.name}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray transition-all hover:bg-guild/10 hover:text-guild"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
            </>
          )}
          <button
            onClick={() => setShowActions(!showActions)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray transition-all hover:bg-white/10 hover:text-white"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showActions && (
            <div className="absolute right-0 top-10 z-10 min-w-[160px] rounded-lg border border-gray-dark bg-black-light py-1 shadow-xl">
              <button
                onClick={() => { onShare(file.id, file.name); setShowActions(false) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-light transition-colors hover:bg-white/5 hover:text-guild"
              >
                <Share2 className="h-4 w-4" />
                Share Link
              </button>
              <button
                onClick={() => { onDelete(file.id, file.name, file.type); setShowActions(false) }}
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

export function ArchiveBrowser({ guildId, guildName, folderId }: ArchiveBrowserProps) {
  const [currentFolderId, setCurrentFolderId] = useState<number | undefined>(folderId)
  const [listing, setListing] = useState<FolderListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: number; name: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string; type: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const refreshListing = useCallback(async () => {
    if (!currentFolderId) return
    try {
      const data = await fetch(`/api/files/${currentFolderId}`).then(r => r.json())
      if (!data.error) {
        setListing(data)
      }
    } catch {
      // ignore
    }
  }, [currentFolderId])

  useEffect(() => {
    if (!currentFolderId) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/files/${currentFolderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setListing(null)
        } else {
          setListing(data)
        }
      })
      .catch(() => setListing(null))
      .finally(() => setLoading(false))
  }, [currentFolderId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const targetFolder = currentFolderId
    if (!targetFolder) return

    setUploading(true)
    setUploadError(null)
    setActionError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/files/${targetFolder}`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Upload failed")
      await refreshListing()
    } catch {
      setUploadError("Failed to upload file")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentFolderId) return

    setCreatingFolder(true)
    setActionError(null)

    try {
      const res = await fetch(`/api/files/${currentFolderId}/folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create folder")
      }

      setNewFolderName("")
      setShowNewFolder(false)
      await refreshListing()
    } catch (err: any) {
      setActionError(err.message || "Failed to create folder")
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    setDeleting(true)
    setActionError(null)

    try {
      const res = await fetch(`/api/files/delete/${deleteConfirm.id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete")
      setDeleteConfirm(null)
      await refreshListing()
    } catch {
      setActionError("Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  const handleShare = async (fileId: number, name: string) => {
    setSharing(true)
    setShareUrl(null)
    setActionError(null)

    try {
      const res = await fetch(`/api/files/share/${fileId}`, {
        method: "POST",
      })

      if (!res.ok) throw new Error("Failed to create share link")
      const data = await res.json()
      setShareUrl(data.url)
    } catch {
      setActionError("Failed to create share link")
    } finally {
      setSharing(false)
    }
  }

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
    }
  }

  const handleFolderClick = (id: number, name: string) => {
    setBreadcrumbs((prev) => [...prev, { id: currentFolderId!, name: listing?.folder || "Archive" }])
    setCurrentFolderId(id)
  }

  const handleBack = () => {
    const prev = breadcrumbs[breadcrumbs.length - 1]
    if (prev) {
      setBreadcrumbs((b) => b.slice(0, -1))
      setCurrentFolderId(prev.id)
    }
  }

  return (
    <div className="flex h-full flex-col p-6 lg:p-8">
      <ChamberHeader
        backHref={`/guild/${guildId}`}
        icon={<Archive className="h-10 w-10 text-guild" />}
        title="Archive"
        subtitle={`Shared knowledge of ${guildName}`}
      />

      {folderId && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-guild px-4 py-2 text-sm font-medium text-black-deep transition-colors hover:bg-guild/80"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload File"}
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <button
            onClick={() => { setShowNewFolder(!showNewFolder); setNewFolderName("") }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-dark px-4 py-2 text-sm text-gray transition-colors hover:border-guild/50 hover:text-guild"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </button>
          {uploadError && (
            <span className="text-xs text-danger">{uploadError}</span>
          )}
        </div>
      )}

      {showNewFolder && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowNewFolder(false) }}
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

      {actionError && (
        <div className="mb-4 text-sm text-danger">{actionError}</div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
          <Trash2 className="h-4 w-4 text-danger" />
          <span className="flex-1 text-sm text-white">
            Delete <strong>{deleteConfirm.name}</strong>{deleteConfirm.type === "folder" ? " and all its contents" : ""}?
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

      {/* Share link display */}
      {shareUrl && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-guild/30 bg-guild/10 px-4 py-3">
          <Link className="h-4 w-4 text-guild" />
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 rounded-lg bg-guild px-3 py-1.5 text-xs font-medium text-black-deep transition-colors hover:bg-guild/80"
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
          <button
            onClick={() => setShareUrl(null)}
            className="text-gray hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {breadcrumbs.length > 0 && (
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-1.5 text-sm text-gray transition-colors hover:text-guild"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{breadcrumbs[breadcrumbs.length - 1]?.name || "Back"}</span>
        </button>
      )}

      <div className="flex-1">
        {!folderId ? (
          <EmptyState message="No archive has been set up for this guild yet." />
        ) : loading ? (
          <div className="flex items-center justify-center py-12 text-gray">Loading...</div>
        ) : !listing || listing.files.length === 0 ? (
          <EmptyState message="This folder is empty." />
        ) : (
          <div className="space-y-3">
            {listing.files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onFolderClick={handleFolderClick}
                onDelete={(id, name, type) => setDeleteConfirm({ id, name, type })}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
