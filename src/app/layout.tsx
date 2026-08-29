import type { Metadata, Viewport } from "next"
import { cinzel, inter, jetbrainsMono } from "@/styles/fonts"
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
  // iOS ignores the manifest's display:"standalone" entirely — Safari
  // only drops its browser chrome for a home-screen-installed app if
  // these Apple-specific tags are present. Without them, "Add to Home
  // Screen" still opens as a normal Safari tab, URL bar and all.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sanctum",
  },
}

export const viewport: Viewport = {
  themeColor: "#c9a227",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  const guilds = await getUserGuilds()

  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body
        className="h-dvh overflow-hidden"
        style={{
          position: 'relative',
          zIndex: 1,
          // viewport-fit=cover draws behind the iOS status bar/notch and
          // home indicator — pad those specifically so chrome-less
          // standalone mode doesn't hide content under them.
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
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
