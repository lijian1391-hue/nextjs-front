"use client"

import { Suspense } from "react"

/**
 * Placeholder analytics provider.
 * Per-product pixel loading is handled directly in product-actions via pixel.ts.
 */
export default function AnalyticsProvider() {
  return <Suspense fallback={null} />
}
