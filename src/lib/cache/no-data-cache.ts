import type { IncrementalCache } from "@opennextjs/aws/types/overrides"

/**
 * Wrapper that disables the Data Cache (fetch cache) while keeping the Route Cache.
 *
 * - get/set with cacheType "fetch" → skip (Data Cache disabled)
 * - get/set with cacheType "cache" → delegate to the real incremental cache (Route Cache)
 */
export function withoutDataCache(cache: IncrementalCache): IncrementalCache {
  return {
    name: cache.name,
    async get(key: string, cacheType?: string) {
      if (cacheType === "fetch") return null
      return cache.get(key, cacheType as never)
    },
    async set(key: string, value: never, cacheType?: string) {
      if (cacheType === "fetch") return
      return cache.set(key, value, cacheType as never)
    },
    async delete(key: string) {
      return cache.delete(key)
    },
  }
}
