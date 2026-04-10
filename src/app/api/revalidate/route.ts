import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { secret, tags, paths } = body

  // Verify the request is authorized
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const results: string[] = []

  // Revalidate by tags
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      revalidateTag(tag)
      results.push(`tag:${tag}`)
    }
  }

  // Revalidate by paths
  if (paths && Array.isArray(paths)) {
    const { revalidatePath } = await import("next/cache")
    for (const path of paths) {
      revalidatePath(path)
      results.push(`path:${path}`)
    }
  }

  return NextResponse.json({ revalidated: true, items: results })
}
