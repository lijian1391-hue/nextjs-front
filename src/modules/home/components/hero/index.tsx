import { Heading } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "Afrylo"

const Hero = () => {
  return (
    <div className="w-full relative bg-ui-bg-subtle">
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-12 py-12 px-4 gap-4">
        <Heading
          level="h1"
          className="text-2xl small:text-3xl leading-8 small:leading-10 text-ui-fg-base font-semibold"
        >
          Welcome to {STORE_NAME}
        </Heading>
        <Heading
          level="h2"
          className="text-base small:text-lg leading-6 text-ui-fg-subtle font-normal max-w-md"
        >
          Quality products, great prices, delivered to your door
        </Heading>
        <LocalizedClientLink
          href="/store"
          className="mt-2 inline-flex items-center justify-center h-10 px-8 bg-jumia-orange hover:bg-jumia-orange-hover text-white text-sm font-semibold rounded-md transition-colors"
        >
          Shop Now
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
