import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { db } from "./db"
import { S3_BUCKET, archiveKey, nextcloudLegacyKey, s3 } from "./s3"

export type { FileNode } from "./files-shared"
export { formatFileSize, DOC_MIME, isDocNode } from "./files-shared"
import type { FileNode } from "./files-shared"
import { DOC_MIME } from "./files-shared"

/**
 * Native archive file index.
 *
 * Truth lives in Postgres `file_nodes` (folder tree + metadata); blobs
 * live in S3 under `sanctum/archive/{guildId}/{nodeId}`. Root folders
 * for a guild have `parent_id = NULL` and are unique by (guildId, name).
 */

interface FileNodeRow {
  id: string
  guild_id: string
  parent_id: string | null
  name: string
  is_folder: boolean
  size_bytes: string | number | null
  mime: string | null
  storage_key: string | null
  created_by: string
  created_at: Date
  updated_at: Date
}

function rowToNode(r: FileNodeRow): FileNode {
  return {
    id: r.id,
    guildId: r.guild_id,
    parentId: r.parent_id,
    name: r.name,
    isFolder: r.is_folder,
    sizeBytes: r.size_bytes === null ? null : Number(r.size_bytes),
    mime: r.mime,
    storageKey: r.storage_key,
    createdBy: r.created_by,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }
}

/**
 * List direct children of `parentId`. Passing null lists the guild's
 * root folder set. Folders sort first, then alphabetical.
 */
export async function listChildren(
  guildId: string,
  parentId: string | null,
): Promise<FileNode[]> {
  const res = parentId === null
    ? await db.query<FileNodeRow>(
        `SELECT * FROM file_nodes
         WHERE guild_id = $1 AND parent_id IS NULL
         ORDER BY is_folder DESC, name ASC`,
        [guildId],
      )
    : await db.query<FileNodeRow>(
        `SELECT * FROM file_nodes
         WHERE guild_id = $1 AND parent_id = $2
         ORDER BY is_folder DESC, name ASC`,
        [guildId, parentId],
      )
  return res.rows.map(rowToNode)
}

export async function getNode(nodeId: string): Promise<FileNode | null> {
  const res = await db.query<FileNodeRow>(
    `SELECT * FROM file_nodes WHERE id = $1`,
    [nodeId],
  )
  return res.rowCount ? rowToNode(res.rows[0]) : null
}

/**
 * Breadcrumb trail from the root down to `nodeId` (inclusive).
 */
export async function getBreadcrumbs(nodeId: string): Promise<FileNode[]> {
  const res = await db.query<FileNodeRow>(
    `WITH RECURSIVE trail AS (
       SELECT *, 0 AS depth FROM file_nodes WHERE id = $1
       UNION ALL
       SELECT f.*, t.depth + 1
         FROM file_nodes f JOIN trail t ON f.id = t.parent_id
     )
     SELECT id, guild_id, parent_id, name, is_folder, size_bytes,
            mime, storage_key, created_by, created_at, updated_at
       FROM trail ORDER BY depth DESC`,
    [nodeId],
  )
  return res.rows.map(rowToNode)
}

export async function createFolder(
  guildId: string,
  parentId: string | null,
  name: string,
  createdBy: string,
): Promise<FileNode> {
  const res = await db.query<FileNodeRow>(
    `INSERT INTO file_nodes (guild_id, parent_id, name, is_folder, created_by)
     VALUES ($1, $2, $3, TRUE, $4)
     RETURNING *`,
    [guildId, parentId, name, createdBy],
  )
  return rowToNode(res.rows[0])
}

/**
 * Create a live document node. `storage_key = 'doc'` is the sentinel;
 * Y.js state lives in the doc_states table and is materialised lazily
 * by the HocusPocus server on first connect.
 */
export async function createDoc(
  guildId: string,
  parentId: string | null,
  name: string,
  createdBy: string,
): Promise<FileNode> {
  const res = await db.query<FileNodeRow>(
    `INSERT INTO file_nodes
       (guild_id, parent_id, name, is_folder, mime, storage_key, created_by)
     VALUES ($1, $2, $3, FALSE, $4, 'doc', $5)
     RETURNING *`,
    [guildId, parentId, name, DOC_MIME, createdBy],
  )
  return rowToNode(res.rows[0])
}

/**
 * Insert a placeholder row, upload the blob, then flip storage_key from
 * 'pending' to the real key. If the S3 put fails, drop the row so the
 * tree never shows a phantom entry.
 */
export async function uploadFile(
  guildId: string,
  parentId: string | null,
  name: string,
  createdBy: string,
  body: Buffer | Uint8Array,
  mime: string,
): Promise<FileNode> {
  const inserted = await db.query<FileNodeRow>(
    `INSERT INTO file_nodes
       (guild_id, parent_id, name, is_folder, size_bytes, mime, storage_key, created_by)
     VALUES ($1, $2, $3, FALSE, $4, $5, 'pending', $6)
     RETURNING *`,
    [guildId, parentId, name, body.byteLength, mime, createdBy],
  )
  const node = rowToNode(inserted.rows[0])
  const key = archiveKey(guildId, node.id)

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: mime,
        ContentLength: body.byteLength,
      }),
    )
  } catch (err) {
    await db.query(`DELETE FROM file_nodes WHERE id = $1`, [node.id])
    throw err
  }

  const finalised = await db.query<FileNodeRow>(
    `UPDATE file_nodes SET storage_key = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [key, node.id],
  )
  return rowToNode(finalised.rows[0])
}

/**
 * Delete a node (folder or file). Collects every descendant blob first
 * so we can nuke them from S3 alongside the DB cascade.
 */
export async function deleteNode(nodeId: string): Promise<void> {
  const descendants = await db.query<{ storage_key: string | null }>(
    `WITH RECURSIVE sub AS (
       SELECT id, storage_key FROM file_nodes WHERE id = $1
       UNION ALL
       SELECT f.id, f.storage_key
         FROM file_nodes f JOIN sub s ON f.parent_id = s.id
     )
     SELECT storage_key FROM sub
       WHERE storage_key IS NOT NULL
         AND storage_key <> 'pending'
         AND storage_key <> 'doc'`,
    [nodeId],
  )

  const keys = descendants.rows.map(r => r.storage_key!).filter(Boolean)
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000)
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: S3_BUCKET,
        Delete: { Objects: batch.map(Key => ({ Key })) },
      }),
    )
  }

  await db.query(`DELETE FROM file_nodes WHERE id = $1`, [nodeId])
}

/**
 * Presigned GET URL for a file node. Expires in 5 minutes and forces
 * the download filename to the node's real name (not the opaque key).
 */
export async function presignDownload(node: FileNode): Promise<string> {
  if (
    node.isFolder ||
    !node.storageKey ||
    node.storageKey === "pending" ||
    node.storageKey === "doc"
  ) {
    throw new Error("Not a downloadable file")
  }
  const cmd = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: node.storageKey,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(node.name)}"`,
    ResponseContentType: node.mime ?? undefined,
  })
  return getSignedUrl(s3, cmd, { expiresIn: 300 })
}

/**
 * Adopt an existing Nextcloud blob into the native tree without moving
 * bytes: same-bucket CopyObject rewrites the metadata under the new
 * sanctum key. Used only by the one-shot migration.
 */
export async function importFromLegacyKey(params: {
  guildId: string
  parentId: string | null
  name: string
  legacyFileId: number | string
  sizeBytes: number
  mime: string
  createdBy: string
}): Promise<FileNode> {
  const inserted = await db.query<FileNodeRow>(
    `INSERT INTO file_nodes
       (guild_id, parent_id, name, is_folder, size_bytes, mime, storage_key, created_by)
     VALUES ($1, $2, $3, FALSE, $4, $5, 'pending', $6)
     RETURNING *`,
    [params.guildId, params.parentId, params.name, params.sizeBytes, params.mime, params.createdBy],
  )
  const node = rowToNode(inserted.rows[0])
  const key = archiveKey(params.guildId, node.id)
  const legacy = nextcloudLegacyKey(params.legacyFileId)

  try {
    await s3.send(
      new CopyObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        CopySource: `${S3_BUCKET}/${encodeURIComponent(legacy)}`,
        MetadataDirective: "REPLACE",
        ContentType: params.mime,
      }),
    )
  } catch (err) {
    await db.query(`DELETE FROM file_nodes WHERE id = $1`, [node.id])
    throw err
  }

  const finalised = await db.query<FileNodeRow>(
    `UPDATE file_nodes SET storage_key = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [key, node.id],
  )
  return rowToNode(finalised.rows[0])
}

