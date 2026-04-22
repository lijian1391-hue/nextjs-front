"use client"

import { HttpTypes } from "@medusajs/types"
import ResponsiveImage from "@modules/common/components/responsive-image"
import { Swiper } from "swiper/react"
import { Pagination } from "swiper/modules"
import "swiper/css"
import "swiper/css/pagination"

type MobileCarouselProps = {
  images: HttpTypes.StoreProductImage[]
}

export default function MobileCarousel({ images }: MobileCarouselProps) {
  return (
    <Swiper
      modules={[Pagination]}
      pagination={{ clickable: true }}
      spaceBetween={0}
      slidesPerView={1}
      className="w-full"
    >
      {images.map((image, index) => (
        <SwiperSlide key={image.id}>
          <div
            className="relative w-full overflow-hidden bg-ui-bg-subtle"
            style={{ aspectRatio: "16/9" }}
          >
            <ResponsiveImage
              src={image.url!}
              alt={`Product image ${index + 1}`}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  )
}