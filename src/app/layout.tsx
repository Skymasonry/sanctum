import type { Metadata, Viewport } from "next"
import { cinzel, cormorant, jetbrainsMono } from "@/styles/fonts"
import { Sidebar, Header } from "@/components/shell"
import { ServiceWorkerRegistration } from "@/components/shell/ServiceWorkerRegistration"
import { getUser } from "@/lib/auth"
import { getUserGuilds } from "@/lib/guilds"
import "./globals.css"

export const metadata: Metadata = {
  title: "Sanctum | The Skymasons",
  description: "The Skymasons Digital Sanctum",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.jpg",
  },
  manifest: "/manifest.webmanifest",
}

export const viewport: Viewport = {
  themeColor: "#c9a227",
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  const guilds = await getUserGuilds()

  return (
    <html lang="en" className={`${cinzel.variable} ${cormorant.variable} ${jetbrainsMono.variable}`}>
      <body className="h-dvh overflow-hidden p-4" style={{ position: 'relative', zIndex: 1 }}>
        <ServiceWorkerRegistration />
        <div className="flex h-full flex-col">
          <Header user={user ? { username: user.username, name: user.name } : null} />
          <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
            <Sidebar guilds={guilds} />
            <main className="min-w-0 flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
