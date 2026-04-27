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
  results.codeVersion = "v6-tag-based" // 确认部署是否包含最新代码
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
      delete: (key: string) => Promise<void>
      name?: string
    } | null

    if (!incrementalCache?.get) {
      results.cacheError = "incrementalCache not available"
    } else {
      results.incrementalCacheDeleteAvailable = !!incrementalCache.delete

      // Check product detail page Route Cache
      const productPath = `/${countryCode}/products/${handle}`
      const cached = await incrementalCache.get(productPath, "cache") as Record<string, unknown> | null

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
      }

      // Check store listing page Route Cache
      const storePath = `/${countryCode}/store`
      const storeCached = await incrementalCache.get(storePath, "cache") as Record<string, unknown> | null
      if (!storeCached) {
        results.storeRouteCacheStatus = "MISS"
      } else {
        results.storeRouteCacheStatus = "HIT"
        results.storeRouteCacheLastModified = storeCached.lastModified
        results.storeRouteCacheLastModifiedDate = new Date((storeCached.lastModified as number) ?? Date.now()).toISOString()
        const storeValue = storeCached.value as Record<string, unknown> | undefined
        if (storeValue) {
          const storeMeta = storeValue.meta as Record<string, unknown> | undefined
          const storeHeaders = storeMeta?.headers as Record<string, string> | undefined
          results.storeRouteCacheTags = storeHeaders?.["x-next-cache-tags"] || "(MISSING)"
        }
      }

      // Check home page Route Cache
      const homePath = `/${countryCode}`
      const homeCached = await incrementalCache.get(homePath, "cache") as Record<string, unknown> | null
      if (!homeCached) {
        results.homeRouteCacheStatus = "MISS"
      } else {
        results.homeRouteCacheStatus = "HIT"
        results.homeRouteCacheLastModified = homeCached.lastModified
        results.homeRouteCacheLastModifiedDate = new Date((homeCached.lastModified as number) ?? Date.now()).toISOString()
      }

      // hasBeenRevalidated test (product page only)
      if (cached) {
        const tagCache = globalThis.tagCache as {
          hasBeenRevalidated: (tags: string[], lastModified: number) => Promise<boolean>
        } | null

        if (tagCache?.hasBeenRevalidated) {
          const tags = (results.routeCacheTags as string)?.split?.(",") ?? []
          const lastMod = (cached.lastModified as number) ?? Date.now()
          results.tagCheckResult = await tagCache.hasBeenRevalidated(tags, lastMod)
          results.tagCheckTags = tags
          results.tagCheckLastModified = lastMod
        }
      }
    }
  } catch (err) {
    results.cacheError = err instanceof Error ? err.message : String(err)
  }

  // === 4. Data Cache (via listProducts, uses cache: "no-store") ===
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

  // === 4b. SDK with cache: "no-store" (test if SDK passes through no-store) ===
  try {
    const { sdk } = await import("@lib/config")
    const sdkResult = await sdk.client.fetch<{ products: { title: string; updated_at: string }[] }>(
      `/store/products`,
      {
        method: "GET",
        query: { handle, country_code: countryCode },
        cache: "no-store",
      }
    )
    const sdkProduct = sdkResult.products?.[0]
    results.sdkNoStoreTitle = sdkProduct?.title ?? "NOT FOUND"
    results.sdkNoStoreUpdatedAt = sdkProduct?.updated_at ?? "N/A"
  } catch (err) {
    results.sdkNoStoreError = err instanceof Error ? err.message : String(err)
  }

  // === 4c. SDK with listProducts-equivalent params (region_id + fields) ===
  // Tests if Medusa backend returns stale data for specific query params
  try {
    const { sdk } = await import("@lib/config")
    const { getRegion } = await import("@lib/data/regions")
    const region = await getRegion(countryCode)
    if (region) {
      const sdkMatchResult = await sdk.client.fetch<{ products: { title: string; updated_at: string }[] }>(
        `/store/products`,
        {
          method: "GET",
          query: {
            handle,
            region_id: region.id,
            fields: "*variants.calculated_price,+variants.inventory_quantity,*variants.images,+metadata,+tags,",
          },
          cache: "no-store",
        }
      )
      const matchProduct = sdkMatchResult.products?.[0]
      results.sdkWithFieldsTitle = matchProduct?.title ?? "NOT FOUND"
      results.sdkWithFieldsUpdatedAt = matchProduct?.updated_at ?? "N/A"
    } else {
      results.sdkWithFieldsError = "Region not found"
    }
  } catch (err) {
    results.sdkWithFieldsError = err instanceof Error ? err.message : String(err)
  }

  // === 4d. Check incrementalCache wrapper ===
  try {
    const incCache = globalThis.incrementalCache as Record<string, unknown> | undefined
    results.incrementalCacheName = incCache?.name ?? "undefined"
    results.incrementalCacheType = typeof incCache
  } catch {
    results.incrementalCacheError = "Failed to read"
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
        results.directApiCacheControl = apiResponse.headers.get("cache-control") ?? "(none)"
        results.directApiCfCacheStatus = apiResponse.headers.get("cf-cache-status") ?? "(none)"
      } else {
        results.directApiStatus = "NOT FOUND"
      }
    } else {
      results.directApiError = "MEDUSA_BACKEND_URL not set"
    }
  } catch (err) {
    results.directApiError = err instanceof Error ? err.message : String(err)
  }

  // === 5b. Same API call WITH cache-busting timestamp ===
  try {
    const backendUrl = process.env.MEDUSA_BACKEND_URL
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    if (backendUrl) {
      const bustUrl = `${backendUrl}/store/products?handle=${encodeURIComponent(handle)}&country_code=${countryCode}&_=${Date.now()}`
      const bustResponse = await fetch(bustUrl, {
        cache: "no-store",
        headers: {
          "x-publishable-api-key": publishableKey || "",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      })
      const bustData = await bustResponse.json() as { products: Record<string, unknown>[] }
      const bustProduct = bustData.products?.[0]
      if (bustProduct) {
        results.bustApiTitle = bustProduct.title
        results.bustApiUpdatedAt = bustProduct.updated_at ?? "N/A"
        results.bustApiCacheControl = bustResponse.headers.get("cache-control") ?? "(none)"
        results.bustApiCfCacheStatus = bustResponse.headers.get("cf-cache-status") ?? "(none)"
      } else {
        results.bustApiStatus = "NOT FOUND"
      }
    }
  } catch (err) {
    results.bustApiError = err instanceof Error ? err.message : String(err)
  }

  // === Summary ===
  const dataMatches = results.directApiTitle === results.dataCacheTitle
  results.summary_dataCacheMatchesApi = dataMatches
  const issues: string[] = []

  // If sdkWithFields matches directApi but dataCache doesn't → Next.js Data Cache issue
  // If sdkWithFields also stale → Medusa backend cache issue (specific to region_id/fields params)
  if (!dataMatches) {
    if (results.sdkWithFieldsTitle === results.directApiTitle) {
      issues.push("DATA CACHE STALE — listProducts returns stale, but SDK with same params returns fresh → Next.js Data Cache issue")
    } else if (results.sdkWithFieldsTitle === results.dataCacheTitle) {
      issues.push("MEDUSA BACKEND STALE — SDK with region_id+fields also returns stale → backend caches response for specific query params")
    } else {
      issues.push("DATA CACHE STALE — unclear source, investigate further")
    }
  }
  if (results.routeCacheStatus === "HIT") {
    issues.push(`Product Route Cache HIT (tags: ${results.routeCacheTags}, tagCheck: ${results.tagCheckResult})`)
  }
  if (results.storeRouteCacheStatus === "HIT") {
    issues.push(`Store Route Cache HIT (tags: ${results.storeRouteCacheTags})`)
  }
  if (results.homeRouteCacheStatus === "HIT") {
    issues.push("Home Route Cache HIT")
  }
  results.summary_issues = issues.length > 0 ? issues : ["All fresh — no stale cache"]

  // Add cache-bust comparison to summary
  if (results.bustApiTitle && results.bustApiTitle !== results.directApiTitle) {
    results.summary_cacheBustFix = "YES — cache-bust param returns fresh data → intermediate HTTP cache is the problem"
  } else if (results.bustApiTitle && results.bustApiTitle === results.directApiTitle) {
    results.summary_cacheBustFix = "NO — cache-bust param returns same stale data → Medusa backend itself is stale"
  }

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } })
}
