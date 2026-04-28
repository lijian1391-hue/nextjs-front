"use client"

import { trackPixel, loadPlatforms, type PixelPlatform } from "@lib/util/pixel"
import { HttpTypes } from "@medusajs/types"
import { useEffect, useRef } from "react"

type PurchaseTrackingProps = {
  order: HttpTypes.StoreOrder
}

export default function PurchaseTracking({ order }: PurchaseTrackingProps) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true

    // Purchase is a critical conversion event — fire to all loaded platforms
    // regardless of per-product pixel_platforms (which only controls page-level SDK loading)
    const platforms: PixelPlatform[] = ["meta", "ga4", "tiktok"]
    loadPlatforms(platforms)

    const eventId = `${order.id}_Purchase`
    const revenue = order.total ? order.total / 100 : undefined
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
  }, [order.id])

  return null
}
