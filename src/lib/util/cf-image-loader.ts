import type { ImageLoader } from "next/image"

const CF_IMAGES_ORIGIN = "images.afrylo.com"
const SITE_ORIGIN = "https://front.afrylo.com"
const ENABLED = process.env.NEXT_PUBLIC_CF_IMAGE_RESIZING === "true"

const cfImageLoader: ImageLoader = ({ src, width, quality }) => {
  if (!ENABLED) return src

  // Skip local paths, data URIs, and SVGs
  if (src.startsWith("/") || src.startsWith("data:") || src.endsWith(".svg")) {
    return src
  }

  // Only optimize images from our R2 domain
  if (!src.includes(CF_IMAGES_ORIGIN)) {
    return src
  }

  const params = [
    `width=${width}`,
    `quality=${quality || 80}`,
    "format=auto",
    "fit=cover",
  ].join(",")

  return `${SITE_ORIGIN}/cdn-cgi/image/${params}/${src}`
}

export default cfImageLoader

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
