"use client"

import { HttpTypes } from "@medusajs/types"
import ResponsiveImage from "@modules/common/components/responsive-image"
import { Swiper, SwiperSlide } from "swiper/react"
import { Pagination } from "swiper/modules"

type ImageCarouselProps = {
  images: HttpTypes.StoreProductImage[]
}

export default function ImageCarousel({ images }: ImageCarouselProps) {
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
