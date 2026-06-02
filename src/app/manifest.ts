import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Sanctum — Skymasons",
    short_name: "Sanctum",
    description: "The Skymasons Digital Sanctum",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#c9a227",
    icons: [
      {
        src: "/icon-512.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  }
}
