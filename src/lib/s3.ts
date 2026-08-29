import { S3Client } from "@aws-sdk/client-s3"

/**
 * S3 client for the shared skymasons bucket (DigitalOcean Spaces).
 *
 * Nextcloud writes objects at key `urn:oid:{fileid}` in the same bucket.
 * Native Sanctum uses `sanctum/archive/{guild_id}/{file_node_id}` so
 * the two key layouts never collide and migration is a same-bucket
 * CopyObject (metadata-only).
 *
 * Env:
 *   SANCTUM_S3_ENDPOINT   (e.g. https://syd1.digitaloceanspaces.com)
 *   SANCTUM_S3_REGION     (e.g. syd1)
 *   SANCTUM_S3_BUCKET     (e.g. skymasons)
 *   SANCTUM_S3_KEY
 *   SANCTUM_S3_SECRET
 */

declare global {

  var __sanctumS3: S3Client | undefined
}

export const s3: S3Client =
  global.__sanctumS3 ??
  new S3Client({
    endpoint: process.env.SANCTUM_S3_ENDPOINT,
    region: process.env.SANCTUM_S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.SANCTUM_S3_KEY ?? "",
      secretAccessKey: process.env.SANCTUM_S3_SECRET ?? "",
    },
    forcePathStyle: false,
  })

if (process.env.NODE_ENV !== "production") {
  global.__sanctumS3 = s3
}

export const S3_BUCKET = process.env.SANCTUM_S3_BUCKET ?? "skymasons"

export function archiveKey(guildId: string, fileNodeId: string): string {
  return `sanctum/archive/${guildId}/${fileNodeId}`
}

export function nextcloudLegacyKey(fileId: number | string): string {
  return `urn:oid:${fileId}`
}

/**
 * Public URL for an object in the shared bucket. Assumes the object
 * was uploaded with ACL: "public-read". Used for guild icons which
 * need to render without a member session (Discover page, invite
 * previews, etc.).
 */
export function publicObjectUrl(key: string): string {
  const endpoint = process.env.SANCTUM_S3_ENDPOINT ?? "https://syd1.digitaloceanspaces.com"
  const clean = endpoint.replace(/^https?:\/\//, "").replace(/\/$/, "")
  return `https://${S3_BUCKET}.${clean}/${key}`
}

export function guildIconKey(iconId: string, ext = "png"): string {
  return `sanctum/guild-icons/${iconId}.${ext}`
}

export function scrollHeaderKey(imageId: string, ext = "jpg"): string {
  return `sanctum/scroll-headers/${imageId}.${ext}`
}
