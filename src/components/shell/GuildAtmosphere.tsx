"use client"

import { useEffect } from "react"

interface GuildAtmosphereProps {
  rgb: string
}

export function GuildAtmosphere({ rgb }: GuildAtmosphereProps) {
  useEffect(() => {
    const [r, g, b] = rgb.split(" ").map(Number)
    const body = document.body
    body.style.backgroundColor = `rgb(${Math.round(r / 10)},${Math.round(g / 10)},${Math.round(b / 10)})`
    body.style.backgroundImage = [
      `radial-gradient(ellipse 70% 60% at 15% 25%, rgba(${r},${g},${b},0.22) 0%, transparent 60%)`,
      `radial-gradient(ellipse 50% 50% at 85% 75%, rgba(${r},${g},${b},0.10) 0%, transparent 55%)`,
      `radial-gradient(ellipse 40% 40% at 60% 10%, rgba(${r},${g},${b},0.14) 0%, transparent 50%)`,
      `radial-gradient(ellipse 80% 80% at 50% 50%, rgba(8,6,3,0.65) 0%, transparent 80%)`,
    ].join(",")
    return () => {
      body.style.backgroundColor = ""
      body.style.backgroundImage = ""
    }
  }, [rgb])

  return null
}
