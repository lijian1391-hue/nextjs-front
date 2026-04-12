import LocalizedClientLink from "@modules/common/components/localized-client-link"

const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "Afrylo"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full bg-white relative small:min-h-screen">
      <div className="h-12 bg-white border-b border-ui-border-base">
        <nav className="flex h-full items-center content-container">
          <div className="flex-1 flex items-center">
            <LocalizedClientLink
              href="/"
              data-testid="store-link"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.ico"
                alt={STORE_NAME}
                className="w-7 h-7"
              />
            </LocalizedClientLink>
          </div>

          <span className="txt-compact-xlarge-plus text-ui-fg-subtle font-semibold">{STORE_NAME}</span>

          <div className="flex-1" />
        </nav>
      </div>
      <div className="relative" data-testid="checkout-container">{children}</div>
    </div>
  )
}
