import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

type IncrementalCache = {
  get: (key: string, type?: string) => Promise<Record<string, unknown> | null>
  delete: (key: string) => Promise<void>
  name?: string
}

// Direct Route Cache deletion — physically removes stale HTML from R2 + L1
async function deleteRouteCacheEntries(
  paths: string[]
): Promise<{ deleted: string[]; failed: string[] }> {
  const deleted: string[] = []
  const failed: string[] = []
  const incrementalCache = globalThis.incrementalCache as IncrementalCache | undefined

  if (!incrementalCache?.delete) {
    console.warn("[revalidate] globalThis.incrementalCache.delete not available")
    return { deleted, failed }
  }

  for (const path of paths) {
    try {
      // Delete from R2 + L1
      await incrementalCache.delete(path)
      // Verify deletion
      const check = await incrementalCache.get(path, "cache")
      if (check?.value) {
        // Still exists — possibly a different cache layer
        failed.push(path)
        console.error(`[revalidate] Route Cache entry still exists after delete: ${path}`)
      } else {
        deleted.push(path)
        console.log(`[revalidate] Deleted Route Cache entry: ${path}`)
      }
    } catch (err) {
      failed.push(path)
      console.error(
        `[revalidate] Failed to delete Route Cache entry: ${path}`,
        err instanceof Error ? err.message : err
      )
    }
  }
  return { deleted, failed }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { secret, tags, paths } = body

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const results: string[] = []

  // Step 1: Tag-based revalidation (updates D1 tag cache timestamps)
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      revalidateTag(tag as string)
      revalidateTag(`storefront-${tag}` as string)
      results.push(`tag:${tag}`)
      console.log(`[revalidate] revalidateTag: ${tag}, storefront-${tag}`)
    }
  }

  // Step 2: Path revalidation
  if (paths && Array.isArray(paths)) {
    for (const path of paths) {
      revalidatePath(path as string)
      results.push(`path:${path}`)
      console.log(`[revalidate] revalidatePath: ${path}`)
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

    // Step 3: Direct Route Cache deletion from R2 + L1
    // Safety net — ensures immediate freshness alongside tag-based revalidation.
    const cacheablePaths = (paths as string[]).filter((p) => {
      // Home page "/" has no revalidate and no generateStaticParams — never cached
      // Only delete paths for pages that have Route Cache entries
      return (
        p.includes("/products/") ||
        p.includes("/store") ||
        p.includes("/categories/") ||
        p.includes("/collections/")
      )
    })

    if (cacheablePaths.length > 0) {
      const result = await deleteRouteCacheEntries(cacheablePaths)
      results.push(`route-cache-deleted:${result.deleted.length}`)
      result.deleted.forEach((p) => results.push(`deleted:${p}`))
      if (result.failed.length > 0) {
        results.push(`route-cache-failed:${result.failed.length}`)
        result.failed.forEach((p) => results.push(`failed:${p}`))
      }
    }
  }

  // Step 4: Purge Cloudflare CDN cache
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
          const errorBody = await purgeResponse.text().catch(() => "")
          results.push(`cdn:purge failed (${purgeResponse.status})`)
          console.error(
            `[revalidate] CDN purge failed — status: ${purgeResponse.status}, response: ${errorBody}`
          )
        }
      } catch (err) {
        results.push("cdn:purge error")
        console.error(
          `[revalidate] CDN purge error: ${err instanceof Error ? err.message : err}`
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
