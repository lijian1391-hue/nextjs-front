"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useEffect, useState } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Pagination } from "swiper/modules"
import "swiper/css"
import "swiper/css/pagination"

type HeroGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const HeroGallery = ({ images }: HeroGalleryProps) => {
  const [mounted, setMounted] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square w-full bg-ui-bg-subtle flex items-center justify-center">
        <span className="text-ui-fg-muted">No image</span>
      </div>
    )
  }

  const singleImage = images.length === 1

  return (
    <div>
      {/* Mobile: Swiper carousel */}
      <div className="block small:hidden">
        {singleImage || !mounted ? (
          <div className="relative aspect-square w-full overflow-hidden bg-ui-bg-subtle">
            <Image
              src={images[0].url!}
              alt="Product image"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <Swiper
            modules={[Pagination]}
            pagination={{ clickable: true }}
            spaceBetween={0}
            slidesPerView={1}
            className="w-full"
          >
            {images.map((image, index) => (
              <SwiperSlide key={image.id}>
                <div className="relative aspect-square w-full overflow-hidden bg-ui-bg-subtle">
                  <Image
                    src={image.url!}
                    alt={`Product image ${index + 1}`}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>

      {/* Desktop: Main image + thumbnail strip */}
      <div className="hidden small:block">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-rounded bg-ui-bg-subtle">
          {images[selectedIndex]?.url && (
            <Image
              src={images[selectedIndex].url}
              alt={`Product image ${selectedIndex + 1}`}
              fill
              priority
              sizes="(max-width: 1280px) 50vw, 600px"
              className="object-cover"
            />
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-3">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setSelectedIndex(index)}
                className={`relative w-16 h-20 rounded-rounded overflow-hidden border-2 transition-colors ${
                  index === selectedIndex
                    ? "border-ui-border-interactive"
                    : "border-transparent"
                }`}
              >
                <Image
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
