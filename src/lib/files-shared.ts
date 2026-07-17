/**
 * Client-safe pieces of the archive layer — types + helpers that can
 * cross the server/client boundary without dragging pg or the AWS SDK
 * into the browser bundle.
 */

export interface FileNode {
  id: string
  guildId: string
  parentId: string | null
  name: string
  isFolder: boolean
  sizeBytes: number | null
  mime: string | null
  storageKey: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

/**
 * Sentinel mime for a live collaborative doc (Y.js state lives in
 * doc_states keyed by file_node id).
 */
export const DOC_MIME = "application/vnd.sanctum.doc"

export function isDocNode(n: Pick<FileNode, "isFolder" | "mime">): boolean {
  return !n.isFolder && n.mime === DOC_MIME
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return ""
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
