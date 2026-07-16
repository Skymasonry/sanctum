/**
 * Strip anything from an SVG string that could execute in a browser
 * context: script tags, foreign objects, event handler attributes,
 * javascript: hrefs.
 *
 * Uses regex rather than DOMParser because DOMParser's strict XML
 * mode rejects a lot of real-world SVGs (missing xmlns, entities,
 * quirks from exporters). Guild icons are served from S3 as <img>
 * anyway, which already sandboxes active content — this is defense
 * in depth on the string.
 */

const DANGEROUS_TAG_PAIRS = ["script", "foreignObject", "iframe", "object", "embed", "audio", "video"]

export function sanitizeSvg(input: string): string | null {
  const trimmed = input.trim().replace(/^\uFEFF/, "") // strip BOM
  if (!trimmed) return null

  // Cheap sanity check that this is actually an SVG.
  if (!/<svg[\s>]/i.test(trimmed)) {
    if (typeof console !== "undefined") console.warn("[sanitizeSvg] no <svg> tag found")
    return null
  }

  let out = trimmed

  // Drop entire dangerous elements including any children.
  for (const tag of DANGEROUS_TAG_PAIRS) {
    const re = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, "gi")
    out = out.replace(re, "")
    // Also self-closing / unclosed variants
    const selfClose = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi")
    out = out.replace(selfClose, "")
  }

  // Strip event handler attributes  (onload="...", onerror='...', onclick=…)
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")

  // Strip javascript: URLs in href / xlink:href.
  out = out.replace(/\s(?:xlink:)?href\s*=\s*"javascript:[^"]*"/gi, "")
  out = out.replace(/\s(?:xlink:)?href\s*=\s*'javascript:[^']*'/gi, "")

  return out
}
