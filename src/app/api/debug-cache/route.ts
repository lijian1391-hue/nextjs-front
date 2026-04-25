import { NextRequest, NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret")
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const handle = request.nextUrl.searchParams.get("handle") || "test"
  const countryCode = request.nextUrl.searchParams.get("country") || "ng"

  const results: Record<string, unknown> = { handle, countryCode }
  results.currentTime = new Date().toISOString()
  results.currentTimeMs = Date.now()

  // === 1. OpenNext config ===
  try {
    const config = globalThis.openNextConfig as Record<string, unknown> | undefined
    results.enableCacheInterception = (config?.dangerous as Record<string, unknown>)?.enableCacheInterception
    results.tagCacheMode = (globalThis.tagCache as Record<string, unknown>)?.mode
    results.tagCacheName = (globalThis.tagCache as Record<string, unknown>)?.name
  } catch {
    results.configError = "Failed to read config"
  }

  // === 2. D1 state ===
  try {
    const { env } = getCloudflareContext()
    const db = env.NEXT_TAG_CACHE_D1
    if (!db) {
      results.d1Error = "D1 binding not found"
    } else {
      const buildId = process.env.NEXT_BUILD_ID ?? "no-build-id"
      results.buildId = buildId
      const currentRows = await db.prepare(
        "SELECT tag, revalidatedAt, stale, expire FROM revalidations WHERE tag LIKE ?"
      ).bind(`${buildId}/%`).all()
      results.d1RowCount = currentRows.results?.length ?? 0
      // Only show the storefront-* tags (skip soft tags)
      results.d1StorefrontTags = (currentRows.results as Record<string, unknown>[])?.filter(
        (r) => (r.tag as string)?.includes("storefront-")
      )
    }
  } catch (err) {
    results.d1Error = err instanceof Error ? err.message : String(err)
  }

  // === 3. Route Cache ===
  try {
    const incrementalCache = globalThis.incrementalCache as {
      get: (key: string, type?: string) => Promise<Record<string, unknown> | null>
    } | null

    if (!incrementalCache?.get) {
      results.cacheError = "incrementalCache not available"
    } else {
      const path = `/${countryCode}/products/${handle}`
      const cached = await incrementalCache.get(path, "cache") as Record<string, unknown> | null

      if (!cached) {
        results.routeCacheStatus = "MISS"
      } else {
        results.routeCacheStatus = "HIT"
        results.routeCacheLastModified = cached.lastModified
        results.routeCacheLastModifiedDate = new Date((cached.lastModified as number) ?? Date.now()).toISOString()

        const value = cached.value as Record<string, unknown> | undefined
        if (value) {
          results.routeCacheType = value.type
          const meta = value.meta as Record<string, unknown> | undefined
          const headers = meta?.headers as Record<string, string> | undefined
          results.routeCacheTags = headers?.["x-next-cache-tags"] || "(MISSING)"
        }

        // hasBeenRevalidated test
        const tagCache = globalThis.tagCache as {
          hasBeenRevalidated: (tags: string[], lastModified: number) => Promise<boolean>
        } | null

        if (tagCache?.hasBeenRevalidated) {
          const tags = (results.routeCacheTags as string)?.split?.(",") ?? []
          const lastMod = (cached.lastModified as number) ?? Date.now()
          results.tagCheckResult = await tagCache.hasBeenRevalidated(tags, lastMod)
        }
      }
    }
  } catch (err) {
    results.cacheError = err instanceof Error ? err.message : String(err)
  }

  // === 4. Data Cache (via listProducts, uses next: { tags, revalidate }) ===
  try {
    const { listProducts } = await import("@lib/data/products")
    const { response } = await listProducts({ countryCode, queryParams: { handle } })
    const product = response.products[0]
    if (product) {
      results.dataCacheTitle = product.title
      results.dataCacheUpdatedAt = (product as Record<string, unknown>).updated_at ?? "N/A"
    } else {
      results.dataCacheStatus = "NOT FOUND"
    }
  } catch (err) {
    results.dataCacheError = err instanceof Error ? err.message : String(err)
  }

  // === 5. Direct Medusa API call (bypass ALL Next.js caching) ===
  try {
    const backendUrl = process.env.MEDUSA_BACKEND_URL
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    if (backendUrl) {
      const apiUrl = `${backendUrl}/store/products?handle=${encodeURIComponent(handle)}&country_code=${countryCode}`
      const apiResponse = await fetch(apiUrl, {
        cache: "no-store",
        headers: {
          "x-publishable-api-key": publishableKey || "",
          "Content-Type": "application/json",
        },
      })
      const apiData = await apiResponse.json() as { products: Record<string, unknown>[] }
      const apiProduct = apiData.products?.[0]
      if (apiProduct) {
        results.directApiTitle = apiProduct.title
        results.directApiUpdatedAt = apiProduct.updated_at ?? "N/A"
      } else {
        results.directApiStatus = "NOT FOUND"
      }
    } else {
      results.directApiError = "MEDUSA_BACKEND_URL not set"
    }
  } catch (err) {
    results.directApiError = err instanceof Error ? err.message : String(err)
  }

  // === Summary ===
  const dataMatches = results.directApiTitle === results.dataCacheTitle
  results.summary_dataCacheMatchesApi = dataMatches
  if (!dataMatches) {
    results.summary_issue = "DATA CACHE STALE - direct API has different data than cached fetch"
  } else if (results.routeCacheStatus === "HIT") {
    results.summary_issue = "Route Cache HIT, check tagCheckResult"
  } else {
    results.summary_issue = "Route Cache MISS, page should render fresh"
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } })
}
