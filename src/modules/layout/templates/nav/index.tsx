import LocalizedClientLink from "@modules/common/components/localized-client-link"

const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "Afrylo"

export default function Nav() {
  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-12 mx-auto border-b-2 border-b-jumia-orange duration-200 bg-white">
        <nav className="content-container txt-xsmall-plus text-ui-fg-subtle flex items-center w-full h-full text-small-regular">
          <div className="flex-1 flex items-center">
            <LocalizedClientLink
              href="/"
              data-testid="nav-store-link"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.ico"
                alt={STORE_NAME}
                className="w-7 h-7"
              />
            </LocalizedClientLink>
          </div>

          <span className="txt-compact-xlarge-plus font-semibold">{STORE_NAME}</span>

          <div className="flex-1" />
        </nav>
      </header>
    </div>
  )
}
