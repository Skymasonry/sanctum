/**
 * SVG utilities for guild emblems.
 *
 * `makeMonogramSvg` composes a crest-style SVG from a small config
 * (initials + shape + background/foreground colors). Everything is
 * pure so both server and client can call it.
 *
 * `sanitizeSvg` strips executable content (scripts, foreign objects,
 * event handlers) from user-uploaded SVG. Icons are served from S3
 * and rendered via <img>, which normally sandboxes SVG script anyway,
 * but we belt-and-suspenders it.
 */

export type MonogramShape = "circle" | "square" | "shield" | "hexagon"

export interface MonogramConfig {
  initials: string
  shape: MonogramShape
  background: string
  foreground: string
}

const SIZE = 512

function shapePath(shape: MonogramShape): string {
  switch (shape) {
    case "circle":
      return `<circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}"/>`
    case "square":
      return `<rect width="${SIZE}" height="${SIZE}" rx="64"/>`
    case "hexagon":
      return `<polygon points="256,8 494,128 494,384 256,504 18,384 18,128"/>`
    case "shield":
      return `<path d="M256 4 L500 92 L500 288 Q500 452 256 508 Q12 452 12 288 L12 92 Z"/>`
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Compute an appropriate font-size given how many initials we're
 * fitting inside the shape. Keeps the mark centered and readable.
 */
function fontSizeFor(len: number): number {
  if (len <= 1) return 300
  if (len === 2) return 240
  return 180
}

export function makeMonogramSvg(config: MonogramConfig): string {
  const initials = config.initials.slice(0, 3).toUpperCase() || "•"
  const fs = fontSizeFor(initials.length)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"><defs><clipPath id="c">${shapePath(config.shape)}</clipPath></defs><g clip-path="url(#c)"><rect width="${SIZE}" height="${SIZE}" fill="${escapeXml(config.background)}"/></g><text x="${SIZE / 2}" y="${SIZE / 2 + fs * 0.05}" text-anchor="middle" dominant-baseline="central" font-family="Cinzel, Georgia, 'Times New Roman', serif" font-size="${fs}" font-weight="600" fill="${escapeXml(config.foreground)}">${escapeXml(initials)}</text></svg>`
}

const DANGEROUS_ELEMENTS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
])

/**
 * Strip anything that could execute. Runs on a DOMParser tree in the
 * browser; the SVG string that comes out is safe to persist and render.
 */
export function sanitizeSvg(svgText: string): string | null {
  if (typeof DOMParser === "undefined") return null

  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, "image/svg+xml")

  if (doc.getElementsByTagName("parsererror").length > 0) return null

  const root = doc.documentElement
  if (root.tagName.toLowerCase() !== "svg") return null

  const walk = (el: Element) => {
    const children = Array.from(el.children)
    for (const child of children) {
      if (DANGEROUS_ELEMENTS.has(child.tagName.toLowerCase())) {
        el.removeChild(child)
        continue
      }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase()
        const value = attr.value.trim().toLowerCase()
        if (name.startsWith("on")) child.removeAttribute(attr.name)
        else if (
          (name === "href" || name === "xlink:href") &&
          value.startsWith("javascript:")
        ) {
          child.removeAttribute(attr.name)
        }
      }
      walk(child)
    }
  }
  walk(root)

  return new XMLSerializer().serializeToString(root)
}
