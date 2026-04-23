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
  pendingCartId?: string
}

export default function CheckoutContent({
  countryCode,
  hasCart,
  cart,
  customer,
  availableShippingMethods,
  availablePaymentMethods,
  pendingCartId,
}: CheckoutContentProps) {
  const router = useRouter()
  const [waiting, setWaiting] = useState(!hasCart)

  // Poll for cart creation when quickOrder is in progress
  useEffect(() => {
    if (hasCart) return

    const storedError = sessionStorage.getItem("quickOrderError")
    if (storedError) {
      setWaiting(false)
      return
    }

    let attempts = 0
    const maxAttempts = 15
    const interval = setInterval(async () => {
      attempts++
      if (attempts >= maxAttempts) {
        clearInterval(interval)
        setWaiting(false)
        return
      }

      try {
        // Check if cart cookie is set (quickOrder completed)
        const res = await fetch("/api/check-cart", { method: "GET" })
        const data = await res.json()
        if (data.hasCart) {
          clearInterval(interval)
          router.refresh()
        }
      } catch {
        // ignore
      }
    }, 300)

    return () => clearInterval(interval)
  }, [hasCart, router])

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

  if (waiting) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 small:py-12 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-jumia-orange border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-ui-fg-muted">Preparing your order...</p>
      </div>
    )
  }

  return (
    <CartErrorHandler
      countryCode={countryCode}
      onRetrySuccess={() => router.refresh()}
    />
  )
}
