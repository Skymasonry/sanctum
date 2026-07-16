/**
 * Strip anything from an SVG string that could execute in a browser
 * context: script tags, foreign objects, event handler attributes,
 * javascript: hrefs. Runs client-side via DOMParser.
 *
 * Guild icons are served from S3 (different origin) and rendered via
 * <img>, which already sandboxes active content — this is defense in
 * depth.
 *
 * Returns null with a console.warn describing why on failure so we
 * can debug rejected uploads.
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

const SVG_NS = "http://www.w3.org/2000/svg"

export function sanitizeSvg(svgText: string): string | null {
  if (typeof DOMParser === "undefined") return null

  const trimmed = svgText.trim().replace(/^\uFEFF/, "") // strip BOM
  if (!trimmed) {
    console.warn("[sanitizeSvg] empty input")
    return null
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(trimmed, "image/svg+xml")
  const root = doc.documentElement

  // Chrome / WebKit put a real parse error under the root as an
  // element whose text starts with 'error on line'. Firefox uses a
  // <parsererror> in a Mozilla namespace. Only reject if the root
  // itself is the parsererror node — otherwise we can mis-match on
  // false positives (e.g. inline styles that mention "error").
  if (root.nodeName.toLowerCase() === "parsererror") {
    console.warn("[sanitizeSvg] DOMParser failed:", root.textContent?.slice(0, 200))
    return null
  }

  const localName = (root.localName || root.tagName).toLowerCase()
  if (localName !== "svg") {
    console.warn("[sanitizeSvg] root is not <svg>, got:", localName)
    return null
  }

  // Some tooling emits an SVG without a namespace declaration; DOMParser
  // will still return an <svg> element but with a null namespaceURI. We
  // add it back so the rendered <img> works everywhere.
  if (!root.namespaceURI) {
    root.setAttribute("xmlns", SVG_NS)
  }

  const walk = (el: Element) => {
    const children = Array.from(el.children)
    for (const child of children) {
      const tag = (child.localName || child.tagName).toLowerCase()
      if (DANGEROUS_ELEMENTS.has(tag)) {
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
