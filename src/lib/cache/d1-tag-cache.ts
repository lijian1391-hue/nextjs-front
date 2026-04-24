import d1 from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache"

/**
 * Wraps the built-in D1 tag cache, replacing writeTags with a
 * deduplicating version (DELETE + INSERT) to avoid the bug where
 * multiple rows for the same tag cause hasBeenRevalidated to pick
 * a stale row.
 */
export default {
  mode: d1.mode,
  name: d1.name,
  getLastRevalidated: (...a: Parameters<typeof d1.getLastRevalidated>) => d1.getLastRevalidated(...a),
  hasBeenRevalidated: (...a: Parameters<typeof d1.hasBeenRevalidated>) => d1.hasBeenRevalidated(...a),
  isStale: (...a: Parameters<typeof d1.isStale>) => d1.isStale(...a),

  async writeTags(tags: (string | { tag: string; stale?: number; expire?: number | null })[]) {
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
          .prepare("INSERT INTO revalidations (tag, revalidatedAt, stale, expire) VALUES (?, ?, ?, ?)")
          .bind(e.key, e.stale, e.stale, e.expire)
      ),
    ])
  },
}
