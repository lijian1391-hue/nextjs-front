import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

// Direct Route Cache deletion — physically removes stale HTML from R2 + L1
async function deleteRouteCacheEntries(paths: string[]): Promise<string[]> {
  const deleted: string[] = []
  const incrementalCache = globalThis.incrementalCache as
    | { delete?: (key: string) => Promise<void> }
    | undefined

  if (!incrementalCache?.delete) {
    console.warn("[revalidate] globalThis.incrementalCache.delete not available")
    return deleted
  }

  for (const path of paths) {
    try {
      await incrementalCache.delete(path)
      deleted.push(path)
      console.log(`[revalidate] Deleted Route Cache entry: ${path}`)
    } catch (err) {
      console.error(
        `[revalidate] Failed to delete Route Cache entry: ${path}`,
        err instanceof Error ? err.message : err
      )
    }
  }
  return deleted
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { secret, tags, paths } = body

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const results: string[] = []

  // Tag-based revalidation (updates D1 tag cache timestamps)
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      revalidateTag(tag as string)
      revalidateTag(`storefront-${tag}` as string)
      results.push(`tag:${tag}`)
      console.log(`[revalidate] revalidateTag called for: ${tag}, storefront-${tag}`)
    }
  }

  // Path revalidation
  if (paths && Array.isArray(paths)) {
    for (const path of paths) {
      revalidatePath(path as string)
      results.push(`path:${path}`)
      console.log(`[revalidate] revalidatePath called for: ${path}`)
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
      console.log(`[revalidate] revalidatePath (layout) called for: ${layoutPath}`)
    }

    // Directly delete Route Cache entries from R2 + L1
    // This forces fresh re-render on next request, bypassing all broken revalidation mechanisms
    const productPaths = (paths as string[]).filter((p) =>
      p.includes("/products/")
    )
    if (productPaths.length > 0) {
      const deleted = await deleteRouteCacheEntries(productPaths)
      results.push(`route-cache-deleted:${deleted.length}`)
      deleted.forEach((p) => results.push(`deleted:${p}`))
    }
  }

  // Purge Cloudflare CDN cache
  const cfZoneId = process.env.CACHE_PURGE_ZONE_ID
  const cfApiToken = process.env.CACHE_PURGE_API_TOKEN
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  if (cfZoneId && cfApiToken && baseUrl) {
    console.log(
      `[revalidate] Attempting CDN purge — zone: ${cfZoneId.slice(0, 8)}..., urls: ${paths?.length ?? 0} paths`
    )
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
          const body = await purgeResponse.text().catch(() => "")
          results.push(`cdn:purge failed (${purgeResponse.status})`)
          console.error(
            `[revalidate] CDN purge failed — status: ${purgeResponse.status}, zone: ${cfZoneId.slice(0, 8)}..., response: ${body}`
          )
        }
      } catch (err) {
        results.push("cdn:purge error")
        console.error(
          `[revalidate] CDN purge error — zone: ${cfZoneId.slice(0, 8)}..., error: ${err instanceof Error ? err.message : err}`
        )
      }
    }
  } else {
    const missing = [
      !cfZoneId ? "CACHE_PURGE_ZONE_ID" : "",
      !cfApiToken ? "CACHE_PURGE_API_TOKEN" : "",
      !baseUrl ? "NEXT_PUBLIC_BASE_URL" : "",
    ]
      .filter(Boolean)
      .join(", ")
    results.push(`cdn:skipped (missing: ${missing})`)
  }

  return NextResponse.json({ revalidated: true, items: results })
}