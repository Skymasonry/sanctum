import http from "http"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string; size: string }> }
) {
  const { username, size } = await params
  const sizeNum = parseInt(size, 10)

  if (!username || isNaN(sizeNum) || sizeNum < 1 || sizeNum > 512) {
    return new NextResponse("Invalid parameters", { status: 400 })
  }

  const headersList = await headers()
  const authUsername = headersList.get("x-authentik-username")
  if (!authUsername) return new NextResponse("Unauthorized", { status: 401 })

  const password = process.env.NEXTCLOUD_ADMIN_PASSWORD ?? ""
  const basicAuth = Buffer.from(`admin:${password}`).toString("base64")

  try {
    const { data, contentType } = await fetchFollowingRedirects(
      `/index.php/avatar/${encodeURIComponent(username)}/${sizeNum}`,
      basicAuth,
      3
    )
    console.log(`[avatar] ${username}/${sizeNum} → ${contentType} (${data.length} bytes)`)
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": contentType, "Cache-Control": "no-cache" },
    })
  } catch (err) {
    console.error(`[avatar] ${username}/${sizeNum} failed:`, err)
    return new NextResponse(new Uint8Array(initialsAvatar(username, sizeNum)), {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" },
    })
  }
}

function fetchFollowingRedirects(
  path: string,
  basicAuth: string,
  maxRedirects: number
): Promise<{ data: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const attempt = (p: string, hops: number) => {
      const req = http.request(
        {
          hostname: "nextcloud",
          port: 80,
          path: p,
          method: "GET",
          headers: {
            Host: "brothers.skymasons.xyz",
            Authorization: `Basic ${basicAuth}`,
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            if (hops <= 0) return reject(new Error("Too many redirects"))
            // Nextcloud may redirect to an absolute URL on the same host — strip origin
            const loc = res.headers.location.replace(/^https?:\/\/[^/]+/, "")
            res.resume()
            attempt(loc, hops - 1)
            return
          }
          const chunks: Buffer[] = []
          res.on("data", (c) => chunks.push(c))
          res.on("end", () => {
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(`HTTP ${res.statusCode} from ${p}`))
            }
            resolve({
              data: Buffer.concat(chunks),
              contentType: res.headers["content-type"] ?? "image/png",
            })
          })
        }
      )
      req.on("error", reject)
      req.setTimeout(5000, () => { req.destroy(); reject(new Error("Timeout")) })
      req.end()
    }
    attempt(path, maxRedirects)
  })
}

function initialsAvatar(username: string, size: number): Buffer {
  const initials = username.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")
  const fontSize = Math.round(size * 0.38)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="rgba(201,162,39,0.18)"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="serif" font-size="${fontSize}" fill="rgba(201,162,39,0.9)">${initials}</text>
</svg>`
  return Buffer.from(svg)
}
