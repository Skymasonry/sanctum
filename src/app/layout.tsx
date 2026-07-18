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
      <body className="flex h-dvh overflow-hidden p-3 gap-3">
        <ServiceWorkerRegistration />
        <Sidebar guilds={guilds} />
        <div className="flex flex-1 flex-col gap-3 min-w-0 overflow-hidden">
          <Header user={user ? { username: user.username, name: user.name } : null} />
          <main className="custom-scrollbar glass rounded-2xl flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
