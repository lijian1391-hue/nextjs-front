"use client"

import { trackPixel, loadPlatforms, getPlatformsFromIds, initPixelIds, type PixelPlatform, type PixelIds } from "@lib/util/pixel"
import { HttpTypes } from "@medusajs/types"
import { useEffect, useRef } from "react"

type PurchaseTrackingProps = {
  order: HttpTypes.StoreOrder
  pixelIds?: PixelIds
}

export default function PurchaseTracking({ order, pixelIds }: PurchaseTrackingProps) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true

    if (!pixelIds) return
    initPixelIds(pixelIds)

    const platforms = getPlatformsFromIds(pixelIds)
    if (!platforms.length) return

    loadPlatforms(platforms)

    const eventId = `${order.id}_Purchase`
    const revenue = (order as any).total ? (order as any).total / 100 : undefined
    const currency = order.currency_code
    const orderItems = order.items ?? []
    const products = orderItems.map((item) => ({
      id: (item as any).product?.id || (item as any).variant?.id,
      item_id: (item as any).variant?.id,
      name: item.product_title,
      price: item.unit_price ? item.unit_price / 100 : undefined,
      quantity: item.quantity,
    }))
    const contentIds = products.map((p) => p.id).filter(Boolean) as string[]

    trackPixel(platforms, "Purchase", {
      value: revenue,
      currency,
      content_ids: contentIds,
      content_type: "product",
      contents: products.map((p) => ({
        id: p.id,
        quantity: p.quantity,
        item_price: p.price,
      })),
      num_items: orderItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
    }, eventId)
  }, [order.id, pixelIds])

  return null
}
