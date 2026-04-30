/* ------------------------------------------------------------------ */
/*  Dynamic ad-pixel loader — loads SDKs per-product, fires events    */
/*  only to platforms specified in product.metadata.pixel_platforms    */
/*  + localStorage retry queue for failed events                      */
/* ------------------------------------------------------------------ */

export type PixelPlatform = "meta" | "ga4" | "tiktok"

export type PixelIds = {
  meta_pixel_id: string | null
  ga4_measurement_id: string | null
  tiktok_pixel_id: string | null
}

type PixelEventData = Record<string, unknown>

/* ---------- runtime state ---------- */
let pixelIds: PixelIds = {
  meta_pixel_id: null,
  ga4_measurement_id: null,
  tiktok_pixel_id: null,
}

const loadedPlatforms = new Set<PixelPlatform>()

/* ================================================================
 *  0. Retry queue (localStorage-backed)
 * ================================================================ */

const STORAGE_KEY = "_medusa_pixel_queue"
const MAX_RETRIES = 3

interface QueuedEvent {
  platforms: PixelPlatform[]
  event: string
  data: PixelEventData
  eventId: string
  retries: number
  ts: number
}

function loadQueue(): QueuedEvent[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  } catch {
    return []
  }
}

function saveQueue(q: QueuedEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q))
  } catch { /* storage full */ }
}

function enqueue(platforms: PixelPlatform[], event: string, data: PixelEventData, eventId: string) {
  const q = loadQueue()
  if (q.some((e) => e.eventId === eventId)) return
  q.push({ platforms, event, data, eventId, retries: 0, ts: Date.now() })
  saveQueue(q)
}

function removeFromQueue(eventId: string) {
  saveQueue(loadQueue().filter((e) => e.eventId !== eventId))
}

function drainQueue() {
  const q = loadQueue()
  if (!q.length) return

  const pending = q.filter((e) => e.retries < MAX_RETRIES)
  for (const entry of pending) {
    setTimeout(() => {
      dispatchToPlatforms(entry.platforms, entry.event, entry.data, entry.eventId)
      removeFromQueue(entry.eventId)
    }, 500 + Math.random() * 1500)
  }

  const pruned = q.filter((e) => e.retries >= MAX_RETRIES)
  if (pruned.length) {
    saveQueue(q.filter((e) => e.retries < MAX_RETRIES))
  }
}

/* ================================================================
 *  1. SDK bootstrap — lazy, per-platform
 * ================================================================ */

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    const s = document.createElement("script")
    s.id = id
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => resolve()
    document.head.appendChild(s)
  })
}

async function loadMeta(pixelId: string) {
  const w = window as any
  if (w.fbq) return

  const n = w.fbq = function (...args: any[]) {
    n.callMethod
      ? n.callMethod.apply(n, args)
      : n.queue.push(args)
  }
  w._fbq = n
  n.push = n
  n.loaded = true
  n.version = "2.0"
  n.queue = []

  n("init", pixelId)
  n("track", "PageView")

  await loadScript(
    "https://connect.facebook.net/en_US/fbevents.js",
    "fb-pixel-sdk"
  )
}

async function loadGA4(measurementId: string) {
  const w = window as any
  w.dataLayer = w.dataLayer || []
  w.gtag = function (...args: any[]) {
    w.dataLayer.push(args)
  }
  w.gtag("js", new Date())
  w.gtag("config", measurementId, { send_page_view: false })
  await loadScript(
    `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
    "gtag-sdk"
  )
}

async function loadTikTok(pixelId: string) {
  const w = window as any
  w.TiktokAnalyticsObject = "ttq"

  if (!w.ttq) {
    const ttq: any = []
    ttq.methods = [
      "page", "track", "identify", "instances", "debug",
      "on", "off", "once", "ready", "alias", "group",
      "enableCookie", "disableCookie",
    ]
    ttq.setAndDefer = function (t: any, e: string) {
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
      }
    }
    for (let i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i])
    }
    ttq.load = function (id: string) {
      ttq._i = ttq._i || {}
      ttq._i[id] = []
      ttq._i[id]._u = "https://analytics.tiktok.com/i18n/pixel/events.js"
      ttq.setAndDefer(ttq._i[id], "init")
    }
    w.ttq = ttq
  }

  w.ttq.load(pixelId)
  w.ttq.page()
  await loadScript(
    "https://analytics.tiktok.com/i18n/pixel/events.js",
    "ttq-sdk"
  )
}

/**
 * Set pixel IDs (called once from pixel config fetch).
 * Can be called multiple times to update IDs for different sales channels.
 */
export function setPixelIds(ids: PixelIds) {
  pixelIds = ids
}

/**
 * Load SDKs only for the requested platforms, using the stored pixel IDs.
 * Each platform is loaded at most once.
 */
export async function loadPlatforms(platforms: PixelPlatform[]) {
  if (typeof window === "undefined") return

  const promises: Promise<void>[] = []

  for (const platform of platforms) {
    if (loadedPlatforms.has(platform)) continue

    if (platform === "meta" && pixelIds.meta_pixel_id) {
      loadedPlatforms.add(platform)
      promises.push(loadMeta(pixelIds.meta_pixel_id))
    } else if (platform === "ga4" && pixelIds.ga4_measurement_id) {
      loadedPlatforms.add(platform)
      promises.push(loadGA4(pixelIds.ga4_measurement_id))
    } else if (platform === "tiktok" && pixelIds.tiktok_pixel_id) {
      loadedPlatforms.add(platform)
      promises.push(loadTikTok(pixelIds.tiktok_pixel_id))
    }
  }

  await Promise.all(promises)

  // Drain retry queue once first SDKs are loaded
  if (loadedPlatforms.size > 0) {
    setTimeout(drainQueue, 3000)
  }
}

/* ================================================================
 *  2. Event dispatch — per-platform
 * ================================================================ */

function fbTrack(event: string, data: PixelEventData, eventId: string) {
  const w = window as any
  if (typeof w.fbq === "function") {
    w.fbq("track", event, data, { eventID: eventId })
  }
}

function gaTrack(event: string, data: PixelEventData) {
  const w = window as any
  if (typeof w.gtag === "function") {
    w.gtag("event", event, data)
  }
}

function ttqTrack(event: string, data: PixelEventData, eventId: string) {
  const w = window as any
  if (typeof w.ttq === "function") {
    w.ttq.track(event, data, { event_id: eventId })
  }
}

function dispatchToPlatforms(
  platforms: PixelPlatform[],
  event: string,
  data: PixelEventData,
  eventId: string
) {
  for (const platform of platforms) {
    if (platform === "meta") fbTrack(event, data, eventId)
    else if (platform === "ga4") gaTrack(event, data)
    else if (platform === "tiktok") ttqTrack(event, data, eventId)
  }
}

/**
 * Fire event to specified platforms + persist to retry queue.
 */
export function trackPixel(
  platforms: PixelPlatform[],
  event: string,
  data: PixelEventData,
  eventId: string
) {
  if (typeof window === "undefined") return

  try {
    dispatchToPlatforms(platforms, event, data, eventId)
    removeFromQueue(eventId)
  } catch {
    enqueue(platforms, event, data, eventId)
  }
}

/* ================================================================
 *  3. PageView helper
 * ================================================================ */

export function trackPixelPageView(platforms: PixelPlatform[]) {
  if (typeof window === "undefined") return

  const w = window as any

  if (platforms.includes("meta") && typeof w.fbq === "function") {
    w.fbq("track", "PageView")
  }
  if (platforms.includes("ga4") && typeof w.gtag === "function") {
    w.gtag("event", "page_view", { send_to: pixelIds.ga4_measurement_id })
  }
  if (platforms.includes("tiktok") && typeof w.ttq === "function") {
    w.ttq.page()
  }
}

/* ================================================================
 *  4. Pixel config fetch helper
 * ================================================================ */

const EMPTY_IDS: PixelIds = { meta_pixel_id: null, ga4_measurement_id: null, tiktok_pixel_id: null }

let cachedPixelIds: PixelIds | null = null
let fetchPromise: Promise<PixelIds> | null = null

/**
 * Server-side: fetch pixel config using MEDUSA_BACKEND_URL (only available on server).
 * Use React.cache() to deduplicate within a single render pass.
 */
export async function fetchPixelConfigServer(): Promise<PixelIds> {
  if (cachedPixelIds) return cachedPixelIds
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
      const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
      const res = await fetch(`${backendUrl}/store/pixel-config`, {
        cache: "no-store",
        headers: {
          "x-publishable-api-key": publishableKey,
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      cachedPixelIds = data.pixel_config as PixelIds
      return cachedPixelIds
    } catch {
      return EMPTY_IDS
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise
}

/**
 * Client-side: accept pixel IDs from server props (no runtime fetch needed).
 * Also initializes the global pixelIds state for loadPlatforms/trackPixel.
 */
export function initPixelIds(ids: PixelIds) {
  setPixelIds(ids)
}

/**
 * Derive which platforms have configured IDs.
 * Used as fallback when product.metadata is not available on client.
 */
export function getPlatformsFromIds(ids: PixelIds): PixelPlatform[] {
  const platforms: PixelPlatform[] = []
  if (ids.meta_pixel_id) platforms.push("meta")
  if (ids.ga4_measurement_id) platforms.push("ga4")
  if (ids.tiktok_pixel_id) platforms.push("tiktok")
  return platforms
}

/**
 * Parse pixel_platforms from product metadata into typed array.
 * Returns empty array if no platforms configured.
 */
export function parsePlatforms(metadata: Record<string, unknown> | null | undefined): PixelPlatform[] {
  if (!metadata?.pixel_platforms) return []
  const raw = metadata.pixel_platforms
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      return filterValidPlatforms(parsed)
    } catch {
      return raw.split(",").map((s: string) => s.trim()) as PixelPlatform[]
    }
  }
  if (Array.isArray(raw)) {
    return filterValidPlatforms(raw)
  }
  return []
}

function filterValidPlatforms(arr: unknown[]): PixelPlatform[] {
  const valid: PixelPlatform[] = ["meta", "ga4", "tiktok"]
  return arr.filter((p): p is PixelPlatform =>
    typeof p === "string" && valid.includes(p as PixelPlatform)
  )
}
