import { defineCloudflareConfig } from "@opennextjs/cloudflare/config"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache"
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache"
import purgeCache from "@opennextjs/cloudflare/overrides/cache-purge/index"

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, {
    mode: "long-lived",
    defaultLongLivedTtlSec: 604800, // 7 days
  }),
  tagCache: d1NextTagCache,
  cachePurge: purgeCache(),
})
