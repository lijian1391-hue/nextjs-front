"use client"

import { Suspense, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { rudderAnalytics } from "@lib/util/rudderstack"

function RudderstackPageTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Track page view on every route change
  useEffect(() => {
    if (rudderAnalytics.isLoaded()) {
      const url =
        pathname + (searchParams?.toString() ? `?${searchParams}` : "")
      rudderAnalytics.page("", "", {
        path: url,
        url: window.location.href,
      })
    }
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
