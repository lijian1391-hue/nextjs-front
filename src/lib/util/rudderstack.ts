import { RudderAnalytics } from "@rudderstack/analytics-js"

const writeKey = process.env.NEXT_PUBLIC_RS_WRITE_KEY
const dataPlaneUrl = process.env.NEXT_PUBLIC_RS_DATA_PLANE_URL

class RudderStackAnalytics {
  private instance: RudderAnalytics | null = null
  private loaded = false

  load(writeKey: string, dataPlaneUrl: string) {
    if (this.loaded || !writeKey || !dataPlaneUrl) return

    this.instance = new RudderAnalytics()
    this.instance.load(writeKey, dataPlaneUrl, {
      integrations: { All: true },
    })
    this.loaded = true
  }

  isLoaded(): boolean {
    return this.loaded
  }

  page(category: string, name: string, properties?: Record<string, unknown>) {
    if (!this.instance) return
    this.instance.page(category, name, properties)
  }

  track(event: string, properties?: Record<string, unknown>) {
    if (!this.instance) return
    this.instance.track(event, properties)
  }

  identify(userId: string, traits?: Record<string, unknown>) {
    if (!this.instance) return
    this.instance.identify(userId, traits)
  }
}

export const rudderAnalytics = new RudderStackAnalytics()

// Auto-load if env vars are available (client-side only)
if (typeof window !== "undefined" && writeKey && dataPlaneUrl) {
  rudderAnalytics.load(writeKey, dataPlaneUrl)
}
