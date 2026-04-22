"use client"

import { HttpTypes } from "@medusajs/types"
import ResponsiveImage from "@modules/common/components/responsive-image"
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
      <div
        className="relative w-full overflow-hidden bg-ui-bg-subtle"
        style={{ aspectRatio: "16/9" }}
      />
    ),
  }
)

type HeroGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const HeroGallery = ({ images }: HeroGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [images])

  if (!images || images.length === 0) {
    return (
      <div
        className="w-full bg-ui-bg-subtle flex items-center justify-center"
        style={{ aspectRatio: "16/9" }}
      >
        <span className="text-ui-fg-muted">No image</span>
      </div>
    )
  }

  return (
    <div>
      {/* Mobile: Swiper carousel, main image 16:9 */}
      <div className="block small:hidden">
        <MobileCarousel images={images} />
      </div>

      {/* Desktop: Main image 1:1 + thumbnail strip */}
      <div className="hidden small:block">
        <div
          className="relative w-full overflow-hidden rounded-rounded bg-ui-bg-subtle"
          style={{ aspectRatio: "1/1" }}
        >
          {images[selectedIndex]?.url && (
            <ResponsiveImage
              src={images[selectedIndex].url}
              alt={`Product image ${selectedIndex + 1}`}
              fill
              priority
              sizes="(max-width: 1280px) 50vw, 1000px"
              className="object-contain"
            />
          )}
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
                <ResponsiveImage
                  src={image.url!}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default HeroGallery
