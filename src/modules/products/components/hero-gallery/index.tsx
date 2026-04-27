"use client"

import { HttpTypes } from "@medusajs/types"
import ResponsiveImage from "@modules/common/components/responsive-image"
import { getCfUrl } from "@lib/util/cf-image-loader"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const MobileCarousel = dynamic(
  () =>
    import("@modules/common/components/mobile-carousel").then(
      (m) => m.default
    ),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full overflow-hidden bg-ui-bg-subtle aspect-square" />
    ),
  }
)

type HeroGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const HeroGallery = ({ images }: HeroGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [images])

  if (!images || images.length === 0) {
    return (
      <div className="w-full bg-ui-bg-subtle flex items-center justify-center aspect-square">
        <span className="text-ui-fg-muted">No image</span>
      </div>
    )
  }

  // After hydration: render only the matching viewport's component
  if (isMobile) {
    return <MobileCarousel images={images} />
  }

  // Desktop (also used for SSR/SSG — isMobile is false on server)
  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-rounded bg-ui-bg-subtle aspect-square">
        <ResponsiveImage
          key={selectedIndex}
          src={images[selectedIndex].url}
          alt={`Product image ${selectedIndex + 1}`}
          fill
          sizes="(max-width: 1280px) 50vw, 1000px"
          className="object-contain"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-3">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              className={`relative w-16 h-16 rounded-rounded overflow-hidden border-2 transition-colors ${
                index === selectedIndex
                  ? "border-ui-border-interactive"
                  : "border-transparent"
              }`}
            >
              <img
                src={getCfUrl(image.url!, 128)}
                alt={`Thumbnail ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default HeroGallery
