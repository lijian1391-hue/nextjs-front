"use client"

import { HttpTypes } from "@medusajs/types"
import OnePageCheckout from "@modules/checkout/templates/one-page-checkout"
import CartErrorHandler from "@modules/checkout/components/cart-error-handler"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type CheckoutContentProps = {
  countryCode: string
  hasCart: boolean
  cart?: HttpTypes.StoreCart
  customer?: HttpTypes.StoreCustomer | null
  availableShippingMethods?: HttpTypes.StoreCartShippingOption[] | null
  availablePaymentMethods?: any[] | null
}

export default function CheckoutContent({
  countryCode,
  hasCart,
  cart,
  customer,
  availableShippingMethods,
  availablePaymentMethods,
}: CheckoutContentProps) {
  const router = useRouter()

  // Check if quickOrder is in progress — ignore server cart data until new cart is ready
  const [isPending, setIsPending] = useState(() => {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem("_medusa_order_pending") === "true"
  })

  // Poll for cart when pending
  useEffect(() => {
    if (!isPending) return

    const storedError = sessionStorage.getItem("quickOrderError")
    if (storedError) {
      sessionStorage.removeItem("_medusa_order_pending")
      setIsPending(false)
      return
    }

    let attempts = 0
    const maxAttempts = 20
    const interval = setInterval(async () => {
      attempts++
      if (attempts >= maxAttempts) {
        clearInterval(interval)
        sessionStorage.removeItem("_medusa_order_pending")
        setIsPending(false)
        return
      }

      try {
        const res = await fetch("/api/check-cart", { method: "GET" })
        const data = await res.json()
        if (data.hasCart) {
          clearInterval(interval)
          sessionStorage.removeItem("_medusa_order_pending")
          sessionStorage.removeItem("quickOrderError")
          router.refresh()
        }
      } catch {
        // ignore
      }
    }, 300)

    return () => clearInterval(interval)
  }, [isPending, router])

  // Pending state: always show "Preparing" regardless of server data
  if (isPending) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 small:py-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-jumia-orange border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-ui-fg-muted">Preparing your order...</p>
      </div>
    )
  }

  if (hasCart && cart) {
    return (
      <OnePageCheckout
        cart={cart}
        customer={customer ?? null}
        availableShippingMethods={availableShippingMethods ?? null}
        availablePaymentMethods={availablePaymentMethods ?? null}
      />
    )
  }

  return (
    <CartErrorHandler
      countryCode={countryCode}
      onRetrySuccess={() => router.refresh()}
    />
  )
}
