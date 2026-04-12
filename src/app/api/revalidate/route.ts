import { revalidateTag, revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { secret, tags, paths, countryCode } = body

  // Verify the request is authorized
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const results: string[] = []
  const cc = countryCode || "ng"

  // Revalidate by tags (may not work due to cache ID prefix,
  // but kept as a fallback)
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      revalidateTag(tag)
      results.push(`tag:${tag}`)
    }
  }

  // Revalidate specific paths sent from the backend
  // (includes product detail pages like /ng/products/handle)
  if (paths && Array.isArray(paths)) {
    for (const path of paths) {
      revalidatePath(path)
      results.push(`path:${path}`)
    }
  }

  // Always revalidate core storefront paths (layout-level)
  // This clears ALL pages sharing the same layout group
  const corePaths = [
    `/${cc}`,
    `/${cc}/store`,
    `/${cc}/products`,
  ]
  for (const path of corePaths) {
    revalidatePath(path, "layout")
    results.push(`path:${path} (layout)`)
  }

  // Purge Cloudflare CDN edge cache for all affected URLs
  // Uses file-based purge (available on all plans, not Enterprise-only)
  const cfZoneId = process.env.CACHE_PURGE_ZONE_ID
  const cfApiToken = process.env.CACHE_PURGE_API_TOKEN
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  if (cfZoneId && cfApiToken && baseUrl) {
    // Collect all unique paths to purge
    const allPaths = new Set<string>()
    if (paths && Array.isArray(paths)) {
      paths.forEach((p: string) => allPaths.add(p))
    }
    corePaths.forEach((p) => allPaths.add(p))

    const urls = Array.from(allPaths).map((p) => `${baseUrl}${p}`)

    try {
      const purgeResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files: urls }),
        }
      )

      if (purgeResponse.ok) {
        results.push(`cdn:purged ${urls.length} URLs`)
      } else {
        const errorBody = await purgeResponse.text()
        results.push(`cdn:purge failed (${purgeResponse.status})`)
        console.error("[revalidate] CDN purge failed:", errorBody)
      }
    } catch (err) {
      results.push("cdn:purge error")
      console.error("[revalidate] CDN purge error:", err)
    }
  } else {
    results.push("cdn:skipped (no credentials)")
  }

  return NextResponse.json({ revalidated: true, items: results })
}
