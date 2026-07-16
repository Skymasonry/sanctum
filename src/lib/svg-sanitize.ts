/**
 * Strip anything from an SVG string that could execute in a browser
 * context: script tags, foreign objects, event handler attributes,
 * javascript: hrefs. Runs client-side via DOMParser. Returns null
 * if the input isn't a valid SVG.
 *
 * Guild icons are served from a different origin (S3) and rendered
 * via <img>, which already sandboxes active content — this is
 * defense in depth.
 */

const DANGEROUS_ELEMENTS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
])

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
