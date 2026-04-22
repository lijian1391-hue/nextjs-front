import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { secret, tags, paths } = body

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const results: string[] = []

  // Tag-based revalidation (for product/category/collection listing caches)
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      revalidateTag(tag as string) // backward compat for any old-format tags
      revalidateTag(`storefront-${tag}` as string) // new fixed-format tags
      results.push(`tag:${tag}`)
    }
  }

  // Path revalidation
  if (paths && Array.isArray(paths)) {
    for (const path of paths) {
      revalidatePath(path as string)
      results.push(`path:${path}`)
    }
    // Layout-level revalidation clears all listing pages in the group
    const layoutPaths = [
      "/[countryCode]",
      "/[countryCode]/store",
      "/[countryCode]/products",
      "/[countryCode]/categories",
      "/[countryCode]/collections",
    ]
    for (const layoutPath of layoutPaths) {
      revalidatePath(layoutPath, "layout")
      results.push(`layout:${layoutPath}`)
    }
  }

  // Purge Cloudflare CDN cache
  const cfZoneId = process.env.CACHE_PURGE_ZONE_ID
  const cfApiToken = process.env.CACHE_PURGE_API_TOKEN
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  if (cfZoneId && cfApiToken && baseUrl) {
    const allUrls = new Set<string>()
    if (paths && Array.isArray(paths)) {
      paths.forEach((p: string) => allUrls.add(`${baseUrl}${p}`))
    }
    // Also purge listing pages
    const listingPages = ["", "/store", "/products", "/categories", "/collections"]
    if (Array.isArray(body.countryCodes)) {
      body.countryCodes.forEach((cc: string) => {
        listingPages.forEach((page) => {
          allUrls.add(`${baseUrl}/${cc}${page}`)
        })
      })
    }
    if (allUrls.size > 0) {
      try {
        const purgeResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cfApiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ files: Array.from(allUrls) }),
          }
        )
        if (purgeResponse.ok) {
          results.push(`cdn:purged ${allUrls.size} URLs`)
        } else {
          results.push(`cdn:purge failed (${purgeResponse.status})`)
        }
      } catch {
        results.push("cdn:purge error")
      }
    }
  } else {
    results.push("cdn:skipped (env vars not configured)")
  }

  return NextResponse.json({ revalidated: true, items: results })
}