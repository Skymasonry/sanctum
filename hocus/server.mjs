/**
 * Sanctum HocusPocus — Y.js sync + persistence for live guild docs.
 *
 * Each Y-document is keyed by a file_nodes.id (UUID). Auth is over the
 * WebSocket upgrade URL via an HMAC-signed token minted by Neo at
 * /api/nodes/{nodeId}/ws-token. Persistence is a single BYTEA row in
 * doc_states keyed by that same id.
 *
 * Env:
 *   PORT                       (default 3003)
 *   SANCTUM_DB_HOST/PORT/USER/PASSWORD/NAME  — shared with Neo
 *   SANCTUM_WS_SECRET          — HMAC secret for token verification
 */
import { Server } from "@hocuspocus/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import pg from "pg"
import * as Y from "yjs"

const { Pool } = pg

const PORT = Number(process.env.PORT ?? 3003)
const SECRET = process.env.SANCTUM_WS_SECRET
if (!SECRET) {
  console.error("SANCTUM_WS_SECRET is required")
  process.exit(1)
}

const pool = new Pool({
  host: process.env.SANCTUM_DB_HOST ?? "nextcloud-postgres",
  port: Number(process.env.SANCTUM_DB_PORT ?? 5432),
  user: process.env.SANCTUM_DB_USER ?? "sanctum",
  password: process.env.SANCTUM_DB_PASSWORD,
  database: process.env.SANCTUM_DB_NAME ?? "sanctum",
  max: 10,
})

/**
 * Verify a compact "HS256" JWT-shaped token. Returns the payload if
 * the signature checks and it hasn't expired, else null.
 */
function verifyToken(token) {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [encHeader, encPayload, sig] = parts
  const expected = createHmac("sha256", SECRET)
    .update(`${encHeader}.${encPayload}`)
    .digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(encPayload, "base64url").toString())
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

const server = new Server({
  port: PORT,
  address: "0.0.0.0",

  async onAuthenticate({ documentName, token }) {
    const payload = verifyToken(token ?? "")
    if (!payload || payload.nodeId !== documentName || !payload.userId) {
      throw new Error("Unauthorized")
    }
    return { user: { id: payload.userId }, guildId: payload.guildId ?? null }
  },

  async onLoadDocument({ documentName }) {
    const res = await pool.query(
      "SELECT y_state FROM doc_states WHERE file_node_id = $1",
      [documentName],
    )
    const ydoc = new Y.Doc()
    if (res.rowCount) {
      Y.applyUpdate(ydoc, res.rows[0].y_state)
    }
    return ydoc
  },

  async onStoreDocument({ documentName, document }) {
    const state = Buffer.from(Y.encodeStateAsUpdate(document))
    await pool.query(
      `INSERT INTO doc_states (file_node_id, y_state, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (file_node_id)
       DO UPDATE SET y_state = EXCLUDED.y_state, updated_at = NOW()`,
      [documentName, state],
    )
    await pool.query(
      "UPDATE file_nodes SET updated_at = NOW() WHERE id = $1",
      [documentName],
    )
  },
})

server.listen()
console.log(`sanctum-hocus listening on ${PORT}`)
