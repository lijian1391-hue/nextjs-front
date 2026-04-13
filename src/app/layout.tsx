import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import RudderstackProvider from "@modules/common/components/rudderstack-provider"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <RudderstackProvider />
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
