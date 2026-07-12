import { headers } from "next/headers"

import { getUser } from "@/lib/auth"
import { ThresholdDashboard } from "@/components/threshold-dashboard"
import type { ThresholdData } from "@/types/threshold"

export const dynamic = "force-dynamic"

export default async function Home() {
  const user = await getUser()

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray">Authenticating...</p>
      </div>
    )
  }

  const initialData = await fetchThreshold()

  return <ThresholdDashboard initialData={initialData} />
}

async function fetchThreshold(): Promise<ThresholdData> {
  const headersList = await headers()
  const host = headersList.get("host") || "localhost:3000"
  const proto = headersList.get("x-forwarded-proto") || "https"
  const cookie = headersList.get("cookie") || ""
  const forward = {
    "x-authentik-username": headersList.get("x-authentik-username") || "",
    "x-authentik-groups": headersList.get("x-authentik-groups") || "",
    "x-authentik-name": headersList.get("x-authentik-name") || "",
    "x-authentik-email": headersList.get("x-authentik-email") || "",
    cookie,
  }
  try {
    const res = await fetch(`${proto}://${host}/api/threshold?touch=1`, {
      headers: forward,
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as ThresholdData
  } catch (err) {
    console.error("Failed to fetch /api/threshold:", err)
    return {
      member: {
        name: "",
        avatar: null,
        lastSeen: null,
      },
      live: [],
      stirring: [],
      gatherings: [],
    }
  }
}
