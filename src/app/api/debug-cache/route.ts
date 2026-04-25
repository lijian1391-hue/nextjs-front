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
  const action = request.nextUrl.searchParams.get("action") || "full"

  const results: Record<string, unknown> = { handle, countryCode, action }
  results.currentTime = new Date().toISOString()
  results.currentTimeMs = Date.now()

  // === 1. Check OpenNext config ===
  try {
    const config = globalThis.openNextConfig as Record<string, unknown> | undefined
    results.enableCacheInterception = (config?.dangerous as Record<string, unknown>)?.enableCacheInterception
    results.tagCacheMode = (globalThis.tagCache as Record<string, unknown>)?.mode
    results.tagCacheName = (globalThis.tagCache as Record<string, unknown>)?.name
  } catch {
    results.configError = "Failed to read globalThis.openNextConfig"
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

      const prefix = `${buildId}/`
      const currentRows = await db.prepare(
        "SELECT tag, revalidatedAt, stale, expire FROM revalidations WHERE tag LIKE ?"
      ).bind(`${prefix}%`).all()
      results.d1Rows = currentRows.results
      results.d1RowCount = currentRows.results?.length ?? 0
    }
  } catch (err) {
    results.d1Error = err instanceof Error ? err.message : String(err)
  }

  // === 3. Route Cache entry inspection ===
  try {
    const incrementalCache = globalThis.incrementalCache as {
      get: (key: string, type?: string) => Promise<Record<string, unknown> | null>
    } | null

    if (!incrementalCache?.get) {
      results.cacheError = "globalThis.incrementalCache.get not available"
    } else {
      const path = `/${countryCode}/products/${handle}`
      results.cacheKey = path

      const cached = await incrementalCache.get(path, "cache") as Record<string, unknown> | null

      if (!cached) {
        results.cacheStatus = "MISS - no cached entry found"
      } else {
        results.cacheStatus = "HIT"
        results.cacheLastModified = cached.lastModified
        results.cacheShouldBypassTagCache = cached.shouldBypassTagCache

        const value = cached.value as Record<string, unknown> | undefined
        if (value) {
          results.cacheType = value.type
          results.cacheRevalidate = value.revalidate

          const meta = value.meta as Record<string, unknown> | undefined
          if (meta) {
            const headers = meta.headers as Record<string, string> | undefined
            if (headers) {
              const cacheTags = headers["x-next-cache-tags"]
              results.cacheXTags = cacheTags || "(MISSING - no x-next-cache-tags header!)"
              results.cacheAllHeaders = Object.keys(headers)
            } else {
              results.cacheXTags = "(MISSING - no meta.headers)"
            }
          } else {
            results.cacheXTags = "(MISSING - no meta)"
          }
        }

        // === 4. Test hasBeenRevalidated directly ===
        const tagCache = globalThis.tagCache as {
          hasBeenRevalidated: (tags: string[], lastModified: number) => Promise<boolean>
        } | null

        if (tagCache?.hasBeenRevalidated && value) {
          const meta = (value as Record<string, unknown>).meta as Record<string, unknown> | undefined
          const headers = meta?.headers as Record<string, string> | undefined
          const rawTags = headers?.["x-next-cache-tags"]?.split(",") ?? []
          const lastMod = (cached.lastModified as number) ?? Date.now()

          results.tagCheckTags = rawTags
          results.tagCheckLastModified = lastMod
          results.tagCheckLastModifiedDate = new Date(lastMod).toISOString()

          try {
            const revalidated = await tagCache.hasBeenRevalidated(rawTags, lastMod)
            results.tagCheckResult = revalidated
            results.tagCheckMeaning = revalidated
              ? "STALE - should be re-rendered"
              : "FRESH - cached entry is still valid"
          } catch (err) {
            results.tagCheckError = err instanceof Error ? err.message : String(err)
          }

          // Also check with storefront- prefix directly
          const storefrontTags = ["storefront-products"]
          try {
            const revalidated2 = await tagCache.hasBeenRevalidated(storefrontTags, lastMod)
            results.tagCheckStorefrontProducts = revalidated2
          } catch {
            // ignore
          }
        }
      }
    }
  } catch (err) {
    results.cacheError = err instanceof Error ? err.message : String(err)
  }

  // === 5. Current product data from Medusa API ===
  try {
    const { listProducts } = await import("@lib/data/products")
    const { response } = await listProducts({ countryCode, queryParams: { handle } })
    const product = response.products[0]
    if (product) {
      results.productTitle = product.title
      results.productUpdatedAt = (product as Record<string, unknown>).updated_at ?? "N/A"
    } else {
      results.productStatus = "NOT FOUND"
    }
  } catch (err) {
    results.productFetchError = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } })
}
