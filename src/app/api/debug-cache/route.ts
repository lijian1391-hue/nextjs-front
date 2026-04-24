import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret")
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const tag = request.nextUrl.searchParams.get("tag") || "storefront-products"
  const handle = request.nextUrl.searchParams.get("handle") || "test"
  const countryCode = request.nextUrl.searchParams.get("country") || "ng"

  const results: Record<string, unknown> = {}

  // 1. Query D1 directly to see what tags exist and their values
  try {
    // @ts-expect-error D1 binding
    const db = globalThis[Symbol.for("cloudflare-context")]?.env?.NEXT_TAG_CACHE_D1
      // fallback: try process.env binding
      ?? (globalThis as Record<string, unknown>).NEXT_TAG_CACHE_D1

    if (!db || typeof (db as { prepare?: unknown }).prepare !== "function") {
      results.d1Error = "D1 binding not found"
    } else {
      const d1 = db as { prepare: (sql: string) => { bind: (...args: string[]) => { raw: () => Promise<unknown[][]> } } }

      // Get all rows for relevant tags
      const tagsToCheck = [
        tag,
        `_N_T_/${countryCode}/products/${handle}`,
        `_N_T_/${countryCode}/products/layout`,
        `_N_T_/${countryCode}/layout`,
        `_N_T_/layout`,
        tag.replace("storefront-", ""),
        `${countryCode}`,
      ]

      const buildId = process.env.NEXT_BUILD_ID ?? "no-build-id"
      results.buildId = buildId

      // Query all revalidations
      const allRows = await d1.prepare(
        "SELECT tag, revalidatedAt, stale, expire FROM revalidations"
      ).bind().raw().catch(() => [])

      results.d1AllRows = allRows

      // Query specific tags with buildId prefix
      const prefixedTags = tagsToCheck.map((t) => `${buildId}/${t}`.replaceAll("//", "/"))
      const placeholders = prefixedTags.map(() => "?").join(", ")
      const tagRows = await d1.prepare(
        `SELECT tag, revalidatedAt, stale, expire FROM revalidations WHERE tag IN (${placeholders})`
      ).bind(...prefixedTags).raw().catch(() => [])

      results.d1TagRows = tagRows
      results.checkedTags = tagsToCheck
      results.prefixedTags = prefixedTags
    }
  } catch (err) {
    results.d1Error = err instanceof Error ? err.message : String(err)
  }

  // 2. Check the product fetch cache entry
  try {
    // @ts-expect-error accessing internal cache
    const ic = globalThis.incrementalCache
    if (ic && typeof ic.get === "function") {
      // Try to get the route cache entry for the product page
      const routeKey = `/products/${handle}`
      const fetchCacheEntry = await ic.get(routeKey, "fetch").catch(() => null)
      results.fetchCacheHit = fetchCacheEntry != null
      if (fetchCacheEntry && typeof fetchCacheEntry === "object") {
        const entry = fetchCacheEntry as { lastModified?: number; value?: unknown }
        results.fetchCacheLastModified = entry.lastModified
        results.fetchCacheAge = entry.lastModified
          ? `${Math.round((Date.now() - entry.lastModified) / 1000)}s ago`
          : "unknown"
      }
    }
  } catch (err) {
    results.fetchCacheError = err instanceof Error ? err.message : String(err)
  }

  // 3. Try fetching product data to see if it's fresh
  try {
    const { listProducts } = await import("@lib/data/products")
    const { response } = await listProducts({
      countryCode,
      queryParams: { handle },
    })
    const product = response.products[0]
    if (product) {
      results.productTitle = product.title
      results.productUpdatedAt = (product as Record<string, unknown>).updated_at ?? "N/A"
    }
  } catch (err) {
    results.productFetchError = err instanceof Error ? err.message : String(err)
  }

  // 4. Current time for comparison
  results.currentTime = new Date().toISOString()
  results.currentTimeMs = Date.now()

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } })
}
