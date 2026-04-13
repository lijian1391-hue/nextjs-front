"use client"

import { rudderAnalytics } from "@lib/util/rudderstack"
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

    rudderAnalytics.track("Order Completed", {
      order_id: order.id,
      revenue: order.total ? order.total / 100 : undefined,
      currency: order.currency_code,
      products: order.items?.map((item) => ({
        product_id: (item as any).product?.id,
        sku: (item as any).variant?.sku,
        name: item.product_title,
        price: item.unit_price ? item.unit_price / 100 : undefined,
        quantity: item.quantity,
      })),
      email: order.email,
    })
  }, [order.id])

  return null
}
