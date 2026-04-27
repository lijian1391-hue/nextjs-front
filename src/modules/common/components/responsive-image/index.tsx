"use client"

import Image, { ImageProps } from "next/image"
import { useState } from "react"
import { getOriginalUrl } from "@lib/util/cf-image-loader"

type ResponsiveImageProps = ImageProps & {
  fallbackSrc?: string
}

export default function ResponsiveImage({
  fallbackSrc,
  onError,
  ...props
}: ResponsiveImageProps) {
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)

  const handleError: React.EventHandler<
    React.SyntheticEvent<HTMLImageElement>
  > = (e) => {
    if (!fallbackUrl) {
      const original =
        fallbackSrc || getOriginalUrl(typeof props.src === "string" ? props.src : "")
      if (original && original !== props.src) {
        setFallbackUrl(original)
        return
      }
    }
    onError?.(e)
  }

  return <Image {...props} src={fallbackUrl || props.src} onError={handleError} />
}
