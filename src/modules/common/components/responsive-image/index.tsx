"use client"

import Image, { ImageProps } from "next/image"
import { useState, useEffect } from "react"
import { getOriginalUrl } from "@lib/util/cf-image-loader"

type ResponsiveImageProps = ImageProps & {
  fallbackSrc?: string
}

export default function ResponsiveImage({
  fallbackSrc,
  onError,
  ...props
}: ResponsiveImageProps) {
  const [src, setSrc] = useState(props.src)
  const [fallback, setFallback] = useState(false)

  // Sync src when props.src changes (e.g. variant switch)
  useEffect(() => {
    if (!fallback) setSrc(props.src)
  }, [props.src, fallback])

  const handleError: React.EventHandler<
    React.SyntheticEvent<HTMLImageElement>
  > = (e) => {
    if (!fallback) {
      const original =
        fallbackSrc || getOriginalUrl(typeof src === "string" ? src : "")
      if (original && original !== src) {
        setSrc(original)
        setFallback(true)
        return
      }
    }
    onError?.(e)
  }

  return <Image {...props} src={src} onError={handleError} />
}
