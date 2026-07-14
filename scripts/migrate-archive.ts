#!/usr/bin/env tsx
/**
 * Migrate a guild's Nextcloud archive into the native tree.
 *
 * For every child under the guild's `folder_id`, walk recursively via
 * the skymasonsnav files API (impersonating the guild's seeder), then:
 *   - folders → INSERT INTO file_nodes (is_folder = true)
 *   - files   → CopyObject same-bucket: urn:oid:{fileid} → sanctum/archive/{guildId}/{nodeId}
 *              plus INSERT INTO file_nodes with the new key.
 *
 * Blobs are not moved — DigitalOcean Spaces CopyObject is a metadata
 * operation in the same bucket, so this migration is cheap and can be
 * re-run per guild without touching Nextcloud's own filecache.
 *
 * Usage:
 *   NEXTCLOUD_URL=https://cloud.skymasons.xyz \
 *   SANCTUM_DB_HOST=... SANCTUM_DB_PASSWORD=... \
 *   SANCTUM_S3_ENDPOINT=... SANCTUM_S3_KEY=... SANCTUM_S3_SECRET=... \
 *   npx tsx scripts/migrate-archive.ts <guildId>
 *
 *   npx tsx scripts/migrate-archive.ts --all
 */
import { db } from "../src/lib/db"
import { createFolder, importFromLegacyKey } from "../src/lib/files"

const NC = process.env.NEXTCLOUD_URL ?? "https://cloud.skymasons.xyz"

interface LegacyNode {
  id: number
  name: string
  type: "file" | "folder"
  mime?: string
  size?: number
  modified: number
}

interface LegacyListing {
  folder: string
  files: LegacyNode[]
}

async function ncList(folderId: number, seeder: string): Promise<LegacyListing | null> {
  const res = await fetch(`${NC}/apps/skymasonsnav/api/files/${folderId}`, {
    headers: {
      "X-Authentik-Username": seeder,
      "X-Authentik-Groups": "",
      "OCS-APIRequest": "true",
    },
  })
  if (!res.ok) {
    console.error(`  legacy list ${folderId} → HTTP ${res.status}`)
    return null
  }
  return (await res.json()) as LegacyListing
}

async function walk(
  guildId: string,
  parentId: string | null,
  legacyFolderId: number,
  seeder: string,
  createdBy: string,
): Promise<{ files: number; folders: number }> {
  const listing = await ncList(legacyFolderId, seeder)
  if (!listing) return { files: 0, folders: 0 }

  let files = 0
  let folders = 0

  for (const item of listing.files) {
    if (item.type === "folder") {
      const node = await createFolder(guildId, parentId, item.name, createdBy)
      folders += 1
      console.log(`  📁 ${item.name} → ${node.id}`)
      const sub = await walk(guildId, node.id, item.id, seeder, createdBy)
      files += sub.files
      folders += sub.folders
    } else {
      try {
        const node = await importFromLegacyKey({
          guildId,
          parentId,
          name: item.name,
          legacyFileId: item.id,
          sizeBytes: item.size ?? 0,
          mime: item.mime ?? "application/octet-stream",
          createdBy,
        })
        files += 1
        console.log(`  📄 ${item.name} (${item.size ?? 0}b) → ${node.id}`)
      } catch (err) {
        console.error(`  ! failed to import ${item.name}:`, err instanceof Error ? err.message : err)
      }
    }
  }

  return { files, folders }
}

async function migrateGuild(guildId: string): Promise<void> {
  const g = await db.query<{ id: string; name: string; seeder_uid: string; folder_id: number | null }>(
    `SELECT id, name, seeder_uid, folder_id FROM guilds WHERE id = $1`,
    [guildId],
  )
  if (g.rowCount === 0) {
    console.error(`Guild ${guildId} not found`)
    return
  }
  const row = g.rows[0]
  if (!row.folder_id) {
    console.log(`⏭  ${row.name}: no legacy folder`)
    return
  }

  const already = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM file_nodes WHERE guild_id = $1`,
    [guildId],
  )
  if (Number(already.rows[0].count) > 0) {
    console.log(`⏭  ${row.name}: already has ${already.rows[0].count} native nodes — skipping`)
    return
  }

  console.log(`▶  ${row.name} (${row.folder_id}) seeder=${row.seeder_uid}`)
  const stats = await walk(guildId, null, row.folder_id, row.seeder_uid, row.seeder_uid)
  console.log(`   done — ${stats.folders} folders, ${stats.files} files\n`)
}

async function main(): Promise<void> {
  const arg = process.argv[2]
  if (!arg) {
    console.error("Usage: migrate-archive.ts <guildId | --all>")
    process.exit(1)
  }

  if (arg === "--all") {
    const rows = await db.query<{ id: string }>(
      `SELECT id FROM guilds WHERE folder_id IS NOT NULL ORDER BY name`,
    )
    for (const r of rows.rows) {
      await migrateGuild(r.id)
    }
  } else {
    await migrateGuild(arg)
  }

  await db.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
