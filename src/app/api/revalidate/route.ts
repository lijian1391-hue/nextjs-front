import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { secret, paths, countryCode } = body

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const cc = countryCode || "ng"
  const results: string[] = []

  // Revalidate specific product/category pages from the backend
  if (paths && Array.isArray(paths)) {
    for (const path of paths) {
      revalidatePath(path)
      results.push(`path:${path}`)
    }
  }

  // Revalidate all listing pages (layout-level clears every page in the group)
  const layoutPaths = [
    `/${cc}`,
    `/${cc}/store`,
    `/${cc}/products`,
    `/${cc}/categories`,
    `/${cc}/collections`,
  ]
  for (const path of layoutPaths) {
    revalidatePath(path, "layout")
    results.push(`layout:${path}`)
  }

  // Purge Cloudflare CDN edge cache
  const cfZoneId = process.env.CACHE_PURGE_ZONE_ID
  const cfApiToken = process.env.CACHE_PURGE_API_TOKEN
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  if (cfZoneId && cfApiToken && baseUrl) {
    const allPaths = new Set<string>()
    if (paths && Array.isArray(paths)) {
      paths.forEach((p: string) => allPaths.add(p))
    }
    layoutPaths.forEach((p) => allPaths.add(p))

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
        results.push(`cdn:purge failed (${purgeResponse.status})`)
      }
    } catch {
      results.push("cdn:purge error")
    }
  } else {
    results.push("cdn:skipped")
  }

  return NextResponse.json({ revalidated: true, items: results })
}
