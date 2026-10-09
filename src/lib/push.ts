import webpush from "web-push"

import { db } from "./db"

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? ""
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ""
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@skymasons.xyz"

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}

export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function saveSubscription(userId: string, sub: PushSubscriptionInput): Promise<void> {
  await db.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth],
  )
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await db.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint])
}

interface SubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/**
 * Best-effort push to every device a set of users has subscribed on.
 * A dead subscription (410 Gone / 404) is pruned; any other failure
 * is logged and skipped — this never throws, since it's always called
 * as a side effect of something that already succeeded (e.g. sending
 * a chat message) and shouldn't be able to fail that.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0 || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const res = await db.query<SubscriptionRow>(
    `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1::text[])`,
    [userIds],
  )

  const body = JSON.stringify(payload)
  await Promise.all(
    res.rows.map(async row => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await removeSubscription(row.endpoint).catch(() => {})
        } else {
          console.error("push send failed:", err)
        }
      }
    }),
  )
}
