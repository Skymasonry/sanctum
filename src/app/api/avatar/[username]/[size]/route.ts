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

  // Forward auth headers from the request
  const headersList = await headers()
  const authUsername = headersList.get("x-authentik-username")

  if (!authUsername) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const imageBuffer = await fetchAvatar(username, sizeNum, authUsername)
    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
      },
    })
  } catch {
    // Return a 1x1 transparent PNG as fallback
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==",
      "base64"
    )
    return new NextResponse(new Uint8Array(pixel), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    })
  }
}

function fetchAvatar(username: string, size: number, authUser: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "nextcloud",
        port: 80,
        path: `/index.php/avatar/${encodeURIComponent(username)}/${size}`,
        method: "GET",
        headers: {
          Host: "brothers.skymasons.xyz",
          "X-Authentik-Username": authUser,
          Authorization: `Basic ${Buffer.from(`admin:${process.env.NEXTCLOUD_ADMIN_PASSWORD ?? ""}`).toString("base64")}`,
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (chunk) => chunks.push(chunk))
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(Buffer.concat(chunks))
          } else {
            reject(new Error(`HTTP ${res.statusCode}`))
          }
        })
      }
    )
    req.on("error", reject)
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error("Timeout"))
    })
    req.end()
  })
}
