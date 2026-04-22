"use client"

import { rudderAnalytics } from "@lib/util/rudderstack"
import { trackPixel } from "@lib/util/pixel"
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

    // RudderStack — backend CAPI also sends Order Completed via RudderStack Node SDK
    try {
      rudderAnalytics.track("Order Completed", {
        order_id: order.id,
        revenue,
        currency,
        products: orderItems.map((item) => ({
          product_id: (item as any).product?.id,
          sku: (item as any).variant?.sku,
          name: item.product_title,
          price: item.unit_price ? item.unit_price / 100 : undefined,
          quantity: item.quantity,
        })),
        email: order.email,
        event_id: eventId,
      })
    } catch {
      // RudderStack failure — non-critical, backend CAPI will cover it
    }

    // Direct pixel SDKs — same eventId for platform deduplication
    trackPixel("Purchase", {
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
