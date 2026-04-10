import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full bg-white relative small:min-h-screen">
      <div className="h-14 bg-white border-b">
        <nav className="flex h-full items-center content-center justify-center">
          <LocalizedClientLink
            href="/"
            className="txt-compact-xlarge-plus text-ui-fg-subtle hover:text-ui-fg-base flex items-center gap-x-2"
            data-testid="store-link"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.ico"
              alt="Afrylo"
              className="w-7 h-7"
            />
            <span className="uppercase">Afrylo</span>
          </LocalizedClientLink>
        </nav>
      </div>
      <div className="relative" data-testid="checkout-container">{children}</div>
    </div>
  )
}
