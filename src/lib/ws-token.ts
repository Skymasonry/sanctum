import { createHmac } from "node:crypto"

/**
 * HMAC-signed token used to authenticate the WebSocket upgrade to the
 * HocusPocus server. Verified with the same SANCTUM_WS_SECRET on both
 * sides. Compact JWT-shaped format (header.payload.signature).
 */

interface WsTokenPayload {
  nodeId: string
  userId: string
  guildId: string
  exp: number
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url")
}

export function signWsToken(
  payload: Omit<WsTokenPayload, "exp">,
  ttlSeconds = 60,
): string {
  const secret = process.env.SANCTUM_WS_SECRET
  if (!secret) throw new Error("SANCTUM_WS_SECRET not configured")

  const header = { alg: "HS256", typ: "JWT" }
  const full: WsTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const encHeader = b64url(JSON.stringify(header))
  const encPayload = b64url(JSON.stringify(full))
  const sig = createHmac("sha256", secret)
    .update(`${encHeader}.${encPayload}`)
    .digest("base64url")
  return `${encHeader}.${encPayload}.${sig}`
}
