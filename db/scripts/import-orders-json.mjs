#!/usr/bin/env node
/**
 * One-off import: orders.json → sanctum Postgres.
 *
 * Reads /var/www/html/data/orders.json from inside the nextcloud
 * container (or a mounted copy at $ORDERS_JSON_PATH) and populates the
 * guilds / guild_members / guild_applications / guild_application_forms
 * tables.
 *
 * Idempotent: uses INSERT ... ON CONFLICT so re-running just refreshes.
 *
 * Usage:
 *   ORDERS_JSON_PATH=/tmp/orders.json \
 *   PGHOST=nextcloud-postgres PGUSER=sanctum PGPASSWORD=... PGDATABASE=sanctum \
 *   node import-orders-json.mjs
 */

import { readFileSync } from "node:fs"
import pg from "pg"

const path = process.env.ORDERS_JSON_PATH ?? "/var/www/html/data/orders.json"
const raw = readFileSync(path, "utf8")
const data = JSON.parse(raw)
const orders = data.orders ?? []

const client = new pg.Client({
  host: process.env.PGHOST ?? "nextcloud-postgres",
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "sanctum",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE ?? "sanctum",
})
await client.connect()

let guilds = 0
let members = 0
let applications = 0
let forms = 0

try {
  await client.query("BEGIN")

  for (const o of orders) {
    const resources = o.resources ?? {}
    await client.query(
      `INSERT INTO guilds (
         id, name, description, icon, color, admission, category,
         pattern_integrity, evolutionary_purpose, seeder_uid, created_at,
         talk_room, calendar_uri, folder_id, folder_name, deck_board_id,
         group_name
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         color = EXCLUDED.color,
         admission = EXCLUDED.admission,
         category = EXCLUDED.category,
         pattern_integrity = EXCLUDED.pattern_integrity,
         evolutionary_purpose = EXCLUDED.evolutionary_purpose,
         seeder_uid = EXCLUDED.seeder_uid,
         talk_room = EXCLUDED.talk_room,
         calendar_uri = EXCLUDED.calendar_uri,
         folder_id = EXCLUDED.folder_id,
         folder_name = EXCLUDED.folder_name,
         deck_board_id = EXCLUDED.deck_board_id,
         group_name = EXCLUDED.group_name`,
      [
        o.id,
        o.name,
        o.description ?? "",
        o.icon ?? "⬡",
        o.color ?? "#c9a227",
        o.admission ?? "open",
        o.category ?? "social",
        o.patternIntegrity ?? "",
        o.evolutionaryPurpose ?? "",
        o.seederUid,
        o.createdAt ? new Date(o.createdAt) : new Date(),
        resources.talkRoom ?? null,
        resources.calendarUri ?? null,
        resources.folderId ?? null,
        resources.folderName ?? null,
        resources.deckBoardId ?? null,
        o.groupName ?? o.name,
      ],
    )
    guilds++

    // members
    await client.query("DELETE FROM guild_members WHERE guild_id = $1", [o.id])
    for (const m of o.members ?? []) {
      await client.query(
        `INSERT INTO guild_members (guild_id, user_id, role) VALUES ($1, $2, $3)`,
        [o.id, m, m === o.seederUid ? "seeder" : "member"],
      )
      members++
    }

    // application form
    const form = o.applicationForm
    if (form?.agreements) {
      await client.query(
        `INSERT INTO guild_application_forms (guild_id, agreements)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (guild_id) DO UPDATE SET agreements = EXCLUDED.agreements`,
        [o.id, JSON.stringify(form.agreements)],
      )
      forms++
    }

    // pending applications
    for (const app of o.applications ?? []) {
      await client.query(
        `INSERT INTO guild_applications (guild_id, user_id, message, agreements, status, applied_at)
         VALUES ($1, $2, $3, $4::jsonb, 'pending', $5)
         ON CONFLICT (guild_id, user_id) DO NOTHING`,
        [o.id, app.userId, app.message ?? "", JSON.stringify(app.agreements ?? []), app.appliedAt ? new Date(app.appliedAt) : new Date()],
      )
      applications++
    }
  }

  await client.query("COMMIT")
  console.log(`imported: ${guilds} guilds, ${members} member rows, ${forms} forms, ${applications} applications`)
} catch (err) {
  await client.query("ROLLBACK")
  console.error("import failed, rolled back:", err)
  process.exitCode = 1
} finally {
  await client.end()
}
