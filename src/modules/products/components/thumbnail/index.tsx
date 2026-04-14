import { Container, clx } from "@medusajs/ui"
import ResponsiveImage from "@modules/common/components/responsive-image"
import React from "react"

import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: any[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  "data-testid"?: string
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  className,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url

  return (
    <Container
      className={clx(
        "relative w-full overflow-hidden bg-ui-bg-subtle shadow-elevation-card-rest rounded-large group-hover:shadow-elevation-card-hover transition-shadow ease-in-out duration-150",
        className,
        {
          "aspect-square": true,
          "max-w-[180px]": size === "small",
          "max-w-[290px]": size === "medium",
          "max-w-[440px]": size === "large",
        }
      )}
      data-testid={dataTestid}
    >
      <ImageOrPlaceholder image={initialImage} size={size} />
    </Container>
  )
}

const ImageOrPlaceholder = ({
  image,
  size,
}: Pick<ThumbnailProps, "size"> & { image?: string }) => {
  // Map size to appropriate srcSet sizes for optimal image loading
  const sizesMap: Record<string, string> = {
    small: "180px",
    medium: "290px",
    large: "440px",
    full: "(max-width: 576px) 50vw, (max-width: 1024px) 33vw, 800px",
    square: "200px",
  }

  return image ? (
    <ResponsiveImage
      src={image}
      alt="Thumbnail"
      className="absolute inset-0 object-cover object-center"
      draggable={false}
      quality={size === "square" ? 60 : 80}
      sizes={sizesMap[size] || "800px"}
      fill
    />
  ) : (
    <div className="w-full h-full absolute inset-0 flex items-center justify-center">
      <PlaceholderImage size={size === "small" ? 16 : 24} />
    </div>
  )
}

export default Thumbnail
