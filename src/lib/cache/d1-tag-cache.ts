import D1NextModeTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache"

/**
 * Wrapper around the built-in D1 tag cache that fixes the duplicate-row bug.
 *
 * The upstream writeTags() uses plain INSERT, accumulating duplicate rows for
 * the same tag.  hasBeenRevalidated / isStale then pick an arbitrary row from
 * the result set — if it picks an old one the revalidation is missed.
 *
 * Fix: DELETE before INSERT so only one row per tag ever exists.
 */
class FixedD1TagCache extends D1NextModeTagCache {
  async writeTags(tags: (string | { tag: string; stale?: number; expire?: number | null })[]) {
    // @ts-expect-error accessing private getConfig
    const { isDisabled, db } = this.getConfig()
    if (isDisabled || tags.length === 0) return

    const nowMs = Date.now()

    // Resolve tag strings (same logic as upstream)
    const entries = tags.map((tag) => {
      const tagStr = typeof tag === "string" ? tag : tag.tag
      const stale = typeof tag === "string" ? nowMs : (tag.stale ?? nowMs)
      const expire = typeof tag === "string" ? null : (tag.expire ?? null)
      // @ts-expect-error accessing private getCacheKey
      const key = this.getCacheKey(tagStr)
      return { key, stale, expire }
    })

    // DELETE existing rows first, then INSERT — prevents duplicates
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
  }
}

export default new FixedD1TagCache()
