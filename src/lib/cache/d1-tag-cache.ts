import d1 from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache"

const ALL_STOREFRONT_TAGS = [
  "storefront-products",
  "storefront-categories",
  "storefront-collections",
]

let warmedUpBuildId: string | null = null

/**
 * On first request after a new deployment, write D1 entries for all storefront
 * tags so that Route Cache entries (from SSG build) can be properly invalidated.
 *
 * Problem: each deployment gets a new buildId, so D1 has zero rows for the new build.
 * hasBeenRevalidated() always returns false → stale SSG HTML served forever.
 *
 * Fix: if no D1 rows exist for current buildId, insert one with expire=now.
 * Since now > SSG build time, hasBeenRevalidated returns true → page re-rendered
 * with fresh API data → new Route Cache entry with fresh HTML.
 */
async function warmUpForNewBuild() {
  // @ts-expect-error private method
  const { isDisabled, db } = d1.getConfig()
  if (isDisabled) return

  // @ts-expect-error private method
  const buildId = d1.getBuildId()
  if (warmedUpBuildId === buildId) return

  // @ts-expect-error private method
  const keys = ALL_STOREFRONT_TAGS.map((tag) => d1.getCacheKey(tag))

  const existing = await db
    .prepare(
      `SELECT tag FROM revalidations WHERE tag IN (${keys.map(() => "?").join(", ")}) LIMIT 1`
    )
    .bind(...keys)
    .first()

  if (existing) {
    warmedUpBuildId = buildId
    return
  }

  // First deployment of this build — write expire = now so
  // hasBeenRevalidated sees: now > lastModified(SSG build time) → true
  const nowMs = Date.now()
  await db.batch([
    ...keys.map((key) =>
      db.prepare("DELETE FROM revalidations WHERE tag = ?").bind(key)
    ),
    ...keys.map((key) =>
      db
        .prepare(
          "INSERT INTO revalidations (tag, revalidatedAt, stale, expire) VALUES (?, ?, ?, ?)"
        )
        .bind(key, nowMs, nowMs, nowMs)
    ),
  ])

  warmedUpBuildId = buildId
}

export default {
  mode: d1.mode,
  name: d1.name,
  getLastRevalidated: (...a: Parameters<typeof d1.getLastRevalidated>) =>
    d1.getLastRevalidated(...a),
  hasBeenRevalidated: async (
    ...a: Parameters<typeof d1.hasBeenRevalidated>
  ) => {
    await warmUpForNewBuild()
    return d1.hasBeenRevalidated(...a)
  },
  isStale: (...a: Parameters<typeof d1.isStale>) => d1.isStale(...a),

  async writeTags(
    tags: (string | { tag: string; stale?: number; expire?: number | null })[]
  ) {
    // @ts-expect-error private method
    const { isDisabled, db } = d1.getConfig()
    if (isDisabled || tags.length === 0) return

    const nowMs = Date.now()
    // @ts-expect-error private method
    const getKey = (t: string) => d1.getCacheKey(t)

    const entries = tags.map((tag) => {
      const tagStr = typeof tag === "string" ? tag : tag.tag
      const stale = typeof tag === "string" ? nowMs : (tag.stale ?? nowMs)
      const expire = typeof tag === "string" ? nowMs : (tag.expire ?? nowMs)
      return { key: getKey(tagStr), stale, expire }
    })

    await db.batch([
      ...entries.map((e) =>
        db.prepare("DELETE FROM revalidations WHERE tag = ?").bind(e.key)
      ),
      ...entries.map((e) =>
        db
          .prepare(
            "INSERT INTO revalidations (tag, revalidatedAt, stale, expire) VALUES (?, ?, ?, ?)"
          )
          .bind(e.key, e.stale, e.stale, e.expire)
      ),
    ])
  },
}
