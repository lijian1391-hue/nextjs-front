import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import AnalyticsProvider from "@modules/common/components/analytics-provider"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <AnalyticsProvider />
        <main className="relative overflow-x-hidden">{props.children}</main>
      </body>
    </html>
  )
}
