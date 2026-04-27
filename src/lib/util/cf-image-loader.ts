import type { ImageLoader } from "next/image"

const CF_IMAGES_ORIGIN = "images.afrylo.com"
const SITE_ORIGIN = "https://front.afrylo.com"
const ENABLED = process.env.NEXT_PUBLIC_CF_IMAGE_RESIZING === "true"

// Extract root domain from SITE_ORIGIN: "front.afrylo.com" → "afrylo.com"
const ROOT_DOMAIN = SITE_ORIGIN.replace(/^https?:\/\//, "").split(".").slice(-2).join(".")

const cfImageLoader: ImageLoader = ({ src, width, quality }) => {
  if (!ENABLED) return src

  // Skip local paths, data URIs, and SVGs
  if (src.startsWith("/") || src.startsWith("data:") || src.endsWith(".svg")) {
    return src
  }

  // Only optimize images from our domain
  if (!matchesDomain(src)) {
    return src
  }

  // Normalize URL: strip protocol for consistent cache key
  const normalizedSrc = src.replace(/^https?:\/\//, "")

  // Fixed quality to avoid cache fragmentation across different quality values
  const params = [
    `width=${width}`,
    "quality=80",
    "format=auto",
    "fit=cover",
  ].join(",")

  return `${SITE_ORIGIN}/cdn-cgi/image/${params}/https://${normalizedSrc}`
}

export default cfImageLoader

// Check if a URL belongs to any subdomain of our root domain
function matchesDomain(src: string): boolean {
  const host = src.replace(/^https?:\/\//, "").split("/")[0]
  return host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`)
}

// Extract original URL from a CF-transformed URL (for onError fallback)
export function getOriginalUrl(src: string): string {
  const prefix = `/cdn-cgi/image/`
  const idx = src.indexOf(prefix)
  if (idx === -1) return src
  const afterPrefix = src.substring(idx + prefix.length)
  const slashIdx = afterPrefix.indexOf("/")
  if (slashIdx === -1) return src
  return afterPrefix.substring(slashIdx + 1)
}

// Build a CF-optimized URL for a given original URL and width
export function getCfUrl(src: string, width: number): string {
  if (!matchesDomain(src)) return src
  const normalizedSrc = src.replace(/^https?:\/\//, "")
  const params = `width=${width},quality=80,format=auto,fit=cover`
  return `${SITE_ORIGIN}/cdn-cgi/image/${params}/https://${normalizedSrc}`
}

// Rewrite image URLs in HTML to CF-optimized URLs
export function rewriteImageUrls(html: string): string {
  if (!html) return html

  return html.replace(
    /(<img\s[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (_, prefix, url, suffix) => {
      if (!matchesDomain(url)) return `${prefix}${url}${suffix}`
      return `${prefix}${getCfUrl(url, 800)}${suffix}`
    }
  )
}
