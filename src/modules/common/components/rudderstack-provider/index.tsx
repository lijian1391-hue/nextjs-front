"use client"

import { Suspense, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { rudderAnalytics } from "@lib/util/rudderstack"
import { trackPixelPageView } from "@lib/util/pixel"

function RudderstackPageTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (rudderAnalytics.isLoaded()) {
      const url =
        pathname + (searchParams?.toString() ? `?${searchParams}` : "")
      rudderAnalytics.page("", "", {
        path: url,
        url: window.location.href,
      })
    }

    trackPixelPageView()
  }, [pathname, searchParams])

  return null
}

export default function RudderstackProvider() {
  return (
    <Suspense fallback={null}>
      <RudderstackPageTracker />
    </Suspense>
  )
}
