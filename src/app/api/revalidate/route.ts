import { revalidateTag, revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { secret, tags, paths, countryCode } = body

  // Verify the request is authorized
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const results: string[] = []
  const cc = countryCode || "ng"

  // Revalidate by tags (may not work due to cache ID prefix,
  // but kept as a fallback)
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      revalidateTag(tag)
      results.push(`tag:${tag}`)
    }
  }

  // Revalidate by paths — this is the reliable mechanism
  // that works regardless of cache ID prefixes
  if (paths && Array.isArray(paths)) {
    for (const path of paths) {
      revalidatePath(path)
      results.push(`path:${path}`)
    }
  }

  // Always revalidate core storefront paths when products change
  const corePaths = [
    `/${cc}`,
    `/${cc}/store`,
  ]
  for (const path of corePaths) {
    revalidatePath(path, "layout")
    results.push(`path:${path} (layout)`)
  }

  return NextResponse.json({ revalidated: true, items: results })
}
