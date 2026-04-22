/* ------------------------------------------------------------------ */
/*  Unified ad-pixel loader — loads SDKs on demand, fires events      */
/* ------------------------------------------------------------------ */

type PixelEventData = Record<string, unknown>

/* ---------- env-driven feature flags ---------- */
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || ""
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""
const GADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || ""
const TTQ_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || ""

let initialized = false

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
    s.onerror = () => resolve() // don't block other pixels
    document.head.appendChild(s)
  })
}

async function loadFacebook() {
  if (!FB_PIXEL_ID) return
  /* fbq stub — filled by the real SDK */
  const w = window as any
  w.fbq =
    w.fbq ||
    function (...args: any[]) {
      ;(w.fbq.queue = w.fbq.queue || []).push(args)
    }
  w.fbq("init", FB_PIXEL_ID)
  w.fbq("track", "PageView") // Facebook requires initial PageView
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
  // Fire all SDK loads in parallel — non-blocking
  loadFacebook()
  loadGoogle()
  loadTikTok()
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

export function trackPixel(
  event: string,
  data: PixelEventData,
  eventId: string
) {
  if (typeof window === "undefined") return
  fbTrack(event, data, eventId)
  gaTrack(event, data)
  ttqTrack(event, data, eventId)
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
