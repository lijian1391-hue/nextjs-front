import { defineCloudflareConfig } from "@opennextjs/cloudflare/config"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache"
import fixedD1TagCache from "./src/lib/cache/d1-tag-cache"
import { withoutDataCache } from "./src/lib/cache/no-data-cache"

export default defineCloudflareConfig({
  incrementalCache: withoutDataCache(
    withRegionalCache(r2IncrementalCache, {
      mode: "long-lived",
      defaultLongLivedTtlSec: 604800, // 7 days
    })
  ),
  tagCache: fixedD1TagCache,
  enableCacheInterception: true,
})
