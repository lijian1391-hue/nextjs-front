import { NextRequest, NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret")
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const handle = request.nextUrl.searchParams.get("handle") || "test"
  const countryCode = request.nextUrl.searchParams.get("country") || "ng"

  const results: Record<string, unknown> = { handle, countryCode }

  try {
    const { env } = getCloudflareContext()
    const db = env.NEXT_TAG_CACHE_D1

    if (!db) {
      results.d1Error = "D1 binding not found in env"
    } else {
      const buildId = process.env.NEXT_BUILD_ID ?? "no-build-id"
      results.buildId = buildId

      // Check table schema
      const schema = await db.prepare("PRAGMA table_info(revalidations)").all()
      results.tableSchema = schema.results

      // Count rows with current build ID
      const prefix = `${buildId}/`
      const currentRows = await db.prepare(
        "SELECT tag, revalidatedAt, stale, expire FROM revalidations WHERE tag LIKE ?"
      ).bind(`${prefix}%`).all()
      results.currentBuildRows = currentRows.results
      results.currentBuildRowCount = currentRows.results?.length ?? 0
    }
  } catch (err) {
    results.d1Error = err instanceof Error ? err.message : String(err)
  }

  // Fetch current product data
  try {
    const { listProducts } = await import("@lib/data/products")
    const { response } = await listProducts({ countryCode, queryParams: { handle } })
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
