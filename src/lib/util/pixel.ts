/* ------------------------------------------------------------------ */
/*  Unified ad-pixel loader — loads SDKs on demand, fires events      */
/*  + localStorage retry queue for failed events                      */
/* ------------------------------------------------------------------ */

type PixelEventData = Record<string, unknown>

/* ---------- env-driven feature flags ---------- */
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || ""
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""
const GADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || ""
const TTQ_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || ""

let initialized = false

/* ================================================================
 *  0. Retry queue (localStorage-backed)
 * ================================================================ */

const STORAGE_KEY = "_medusa_pixel_queue"
const MAX_RETRIES = 3

interface QueuedEvent {
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
  } catch { /* storage full — drop silently */ }
}

function enqueue(event: string, data: PixelEventData, eventId: string) {
  const q = loadQueue()
  // Avoid duplicate entries for same eventId
  if (q.some((e) => e.eventId === eventId)) return
  q.push({ event, data, eventId, retries: 0, ts: Date.now() })
  saveQueue(q)
}

function removeFromQueue(eventId: string) {
  const q = loadQueue().filter((e) => e.eventId !== eventId)
  saveQueue(q)
}

function markRetried(eventId: string) {
  const q = loadQueue()
  const entry = q.find((e) => e.eventId === eventId)
  if (entry) entry.retries += 1
  saveQueue(q)
}

/** Drain pending events on page load — called once from initPixels */
function drainQueue() {
  const q = loadQueue()
  if (!q.length) return

  const pending = q.filter((e) => e.retries < MAX_RETRIES)
  for (const entry of pending) {
    // Small stagger to avoid hammering
    setTimeout(() => {
      dispatchToAllPlatforms(entry.event, entry.data, entry.eventId)
      removeFromQueue(entry.eventId)
    }, 500 + Math.random() * 1500)
  }

  // Prune events that exceeded max retries
  const pruned = q.filter((e) => e.retries >= MAX_RETRIES)
  if (pruned.length) {
    console.warn(`[pixel] dropping ${pruned.length} exhausted events`)
    saveQueue(q.filter((e) => e.retries < MAX_RETRIES))
  }
}

/* ================================================================
 *  1. SDK bootstrap (called once from rudderstack.ts)
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

async function loadFacebook() {
  if (!FB_PIXEL_ID) return
  const w = window as any
  w.fbq =
    w.fbq ||
    function (...args: any[]) {
      ;(w.fbq.queue = w.fbq.queue || []).push(args)
    }
  w.fbq("init", FB_PIXEL_ID)
  w.fbq("track", "PageView")
  await loadScript(
    `https://connect.facebook.net/en_US/fbevents.js`,
    "fb-pixel-sdk"
  )
}

async function loadGoogle() {
  if (!GA_ID && !GADS_ID) return
  const w = window as any
  w.dataLayer = w.dataLayer || []
  w.gtag = function (...args: any[]) {
    w.dataLayer.push(args)
  }
  w.gtag("js", new Date())
  if (GA_ID) w.gtag("config", GA_ID, { send_page_view: false })
  if (GADS_ID) w.gtag("config", GADS_ID, { send_page_view: false })
  await loadScript(
    `https://www.googletagmanager.com/gtag/js?id=${GA_ID || GADS_ID}`,
    "gtag-sdk"
  )
}

async function loadTikTok() {
  if (!TTQ_ID) return
  const w = window as any
  w.TiktokAnalyticsObject = "ttq"
  w.ttq =
    w.ttq ||
    function (...args: any[]) {
      ;(w.ttq.methods = w.ttq.methods || []).push(args)
    }
  w.ttq.load = function (id: string) {
    w.ttq._i = id
  }
  w.ttq.load(TTQ_ID)
  w.ttq.page()
  await loadScript(
    `https://analytics.tiktok.com/i18n/pixel/events.js`,
    "ttq-sdk"
  )
}

export function initPixels() {
  if (initialized || typeof window === "undefined") return
  initialized = true
  loadFacebook()
  loadGoogle()
  loadTikTok()
  // Drain any previously failed events after SDKs have had time to load
  setTimeout(drainQueue, 3000)
}

/* ================================================================
 *  2. Unified event dispatch
 * ================================================================ */

function fbTrack(event: string, data: PixelEventData, eventId: string) {
  if (!FB_PIXEL_ID) return
  const w = window as any
  if (typeof w.fbq === "function") {
    w.fbq("track", event, data, { eventID: eventId })
  }
}

function gaTrack(event: string, data: PixelEventData) {
  if (!GA_ID && !GADS_ID) return
  const w = window as any
  if (typeof w.gtag === "function") {
    const payload: Record<string, unknown> = { ...data }
    if (GADS_ID && (event === "Purchase" || event === "conversion")) {
      payload.send_to = GADS_ID
    }
    w.gtag("event", event, payload)
  }
}

function ttqTrack(event: string, data: PixelEventData, eventId: string) {
  if (!TTQ_ID) return
  const w = window as any
  if (typeof w.ttq === "function") {
    w.ttq.track(event, data, { event_id: eventId })
  }
}

function dispatchToAllPlatforms(
  event: string,
  data: PixelEventData,
  eventId: string
) {
  fbTrack(event, data, eventId)
  gaTrack(event, data)
  ttqTrack(event, data, eventId)
}

/**
 * Fire event to all pixel platforms + persist to retry queue.
 * If SDKs haven't loaded yet the event will be retried from queue.
 */
export function trackPixel(
  event: string,
  data: PixelEventData,
  eventId: string
) {
  if (typeof window === "undefined") return

  try {
    dispatchToAllPlatforms(event, data, eventId)
    // Assume success — platforms queue internally if SDK still loading
    removeFromQueue(eventId)
  } catch {
    // Persist for retry on next page load
    enqueue(event, data, eventId)
  }
}

/* ================================================================
 *  3. PageView helper
 * ================================================================ */

export function trackPixelPageView() {
  if (typeof window === "undefined") return

  if (FB_PIXEL_ID) {
    const w = window as any
    if (typeof w.fbq === "function") w.fbq("track", "PageView")
  }
  if (GA_ID || GADS_ID) {
    const w = window as any
    if (typeof w.gtag === "function")
      w.gtag("event", "page_view", { send_to: GA_ID || GADS_ID })
  }
  if (TTQ_ID) {
    const w = window as any
    if (typeof w.ttq === "function") w.ttq.page()
  }
}
