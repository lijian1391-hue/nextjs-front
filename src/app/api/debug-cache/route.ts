import { NextRequest, NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret")
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const tag = request.nextUrl.searchParams.get("tag") || "storefront-products"
  const handle = request.nextUrl.searchParams.get("handle") || "test"
  const countryCode = request.nextUrl.searchParams.get("country") || "ng"

  const results: Record<string, unknown> = { tag, handle, countryCode }

  // 1. Query D1 directly
  try {
    const { env } = getCloudflareContext()
    const db = env.NEXT_TAG_CACHE_D1

    if (!db) {
      results.d1Error = "D1 binding not found in env"
    } else {
      const buildId = process.env.NEXT_BUILD_ID ?? "no-build-id"
      results.buildId = buildId

      // Get ALL rows to see the full picture
      const allRows = await db.prepare("SELECT tag, revalidatedAt, stale, expire FROM revalidations").all()
      results.d1RowCount = allRows.results?.length ?? 0
      results.d1AllRows = allRows.results

      // Check specific tags with buildId prefix
      const tagsToCheck = [
        tag,
        `storefront-${tag}`,
        `_N_T_/${countryCode}/products/${handle}`,
        `_N_T_/${countryCode}/products/layout`,
        `_N_T_/${countryCode}/layout`,
        `_N_T_/layout`,
        `${countryCode}`,
        "products",
        "storefront-products",
        "storefront-regions",
      ]
      const prefixed = tagsToCheck.map((t) => `${buildId}/${t}`.replaceAll("//", "/"))
      const ph = prefixed.map(() => "?").join(", ")
      const tagRows = await db.prepare(
        `SELECT tag, revalidatedAt, stale, expire FROM revalidations WHERE tag IN (${ph})`
      ).bind(...prefixed).all()

      results.checkedTags = tagsToCheck
      results.prefixedTags = prefixed
      results.d1TagRows = tagRows.results

      // Now check: would hasBeenRevalidated return true?
      // hasBeenRevalidated logic: expire != null && expire <= now && expire > lastModified
      const now = Date.now()
      results.nowMs = now

      // Simulate: if lastModified was 5 minutes ago, would any tag be "revalidated"?
      const fiveMinAgo = now - 300_000
      const staleCheck = (tagRows.results ?? []).map((row: Record<string, unknown>) => {
        const expire = row.expire as number | null
        const revalidatedAt = row.revalidatedAt as number | null
        if (expire != null) {
          const isExpired = expire <= now
          const isNewerThan5min = expire > fiveMinAgo
          const isNewerThan1min = expire > (now - 60_000)
          return {
            tag: row.tag,
            expire,
            revalidatedAt,
            isExpired,
            newerThan5minAgo: isNewerThan5min,
            newerThan1minAgo: isNewerThan1min,
            ageMs: now - expire,
          }
        }
        if (revalidatedAt != null) {
          return {
            tag: row.tag,
            expire: null,
            revalidatedAt,
            newerThan5minAgo: revalidatedAt > fiveMinAgo,
            ageMs: now - revalidatedAt,
          }
        }
        return { tag: row.tag, expire: null, revalidatedAt: null }
      })
      results.staleCheck = staleCheck
    }
  } catch (err) {
    results.d1Error = err instanceof Error ? err.message : String(err)
  }

  // 2. Fetch current product data to compare freshness
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

  results.currentTime = new Date().toISOString()

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } })
}
