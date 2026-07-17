import { Pool } from "pg"

/**
 * Shared Postgres pool for the native Sanctum backend.
 *
 * Connection details come from env. In local dev + prod alike we run
 * against the sanctum database in the existing nextcloud-postgres
 * container.
 *
 * Set via docker-compose:
 *   SANCTUM_DB_HOST      (default: nextcloud-postgres)
 *   SANCTUM_DB_PORT      (default: 5432)
 *   SANCTUM_DB_USER      (default: sanctum)
 *   SANCTUM_DB_PASSWORD  (required)
 *   SANCTUM_DB_NAME      (default: sanctum)
 */

declare global {

  var __sanctumPool: Pool | undefined
}

export const db: Pool =
  global.__sanctumPool ??
  new Pool({
    host: process.env.SANCTUM_DB_HOST ?? "nextcloud-postgres",
    port: Number(process.env.SANCTUM_DB_PORT ?? 5432),
    user: process.env.SANCTUM_DB_USER ?? "sanctum",
    password: process.env.SANCTUM_DB_PASSWORD,
    database: process.env.SANCTUM_DB_NAME ?? "sanctum",
    max: 10,
    idleTimeoutMillis: 30_000,
  })

// Cache the pool across Next.js hot-reloads so we don't leak connections.
if (process.env.NODE_ENV !== "production") {
  global.__sanctumPool = db
}
