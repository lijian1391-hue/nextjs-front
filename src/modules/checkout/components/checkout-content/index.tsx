"use client"

import { HttpTypes } from "@medusajs/types"
import OnePageCheckout from "@modules/checkout/templates/one-page-checkout"
import CartErrorHandler from "@modules/checkout/components/cart-error-handler"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

type CheckoutContentProps = {
  countryCode: string
  hasCart: boolean
  cart?: HttpTypes.StoreCart
  customer?: HttpTypes.StoreCustomer | null
  availableShippingMethods?: HttpTypes.StoreCartShippingOption[] | null
  availablePaymentMethods?: any[] | null
}

function LoadingSpinner() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 small:py-12 text-center">
      <div className="animate-spin w-8 h-8 border-2 border-jumia-orange border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-ui-fg-muted">Preparing your order...</p>
    </div>
  )
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

  // Check if quickOrder is in progress
  const [isPending, setIsPending] = useState(() => {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem("_medusa_order_pending") === "true"
  })

  // Track whether client has hydrated
  const [hydrated, setHydrated] = useState(false)

  // Local cart state: used when polling supplies fresh data directly
  const [localCart, setLocalCart] = useState<HttpTypes.StoreCart | undefined>(cart)

  // Merge: server cart is initial state; localCart wins when polling provides fresh data
  const displayCart = localCart ?? cart

  // Poll init-checkout — stronger signal than check-cart because it waits for
  // cart data to be fully ready (cart exists + shipping + payment initialized).
  // Returns the actual cart so we set it directly, bypassing stale server-render data.
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!isPending) return

    const storedError = sessionStorage.getItem("quickOrderError")
    if (storedError) {
      sessionStorage.removeItem("_medusa_order_pending")
      setIsPending(false)
      return
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/init-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartId: null }),
          cache: "no-store",
        })
        const data = await res.json()

        // init-checkout succeeds only when cart data is fully ready
        if (data.ok && data.cart) {
          if (pollingRef.current) clearInterval(pollingRef.current)
          sessionStorage.removeItem("_medusa_order_pending")
          sessionStorage.removeItem("quickOrderError")
          setLocalCart(data.cart)
          setIsPending(false)
        }
      } catch {
        // keep polling
      }
    }, 300)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [isPending])

  if (hasCart && displayCart) {
    return (
      <OnePageCheckout
        cart={displayCart}
        customer={customer ?? null}
        availableShippingMethods={availableShippingMethods ?? null}
        availablePaymentMethods={availablePaymentMethods ?? null}
      />
    )
  }

  // Pending state: show spinner until polling resolves
  if (isPending) {
    return <LoadingSpinner />
  }

  // Not yet hydrated on client — show spinner to avoid SSR blank flash
  if (!hydrated) {
    return <LoadingSpinner />
  }

  // Client-side, no cart, no pending — redirect via CartErrorHandler
  return (
    <CartErrorHandler
      countryCode={countryCode}
      onRetrySuccess={() => router.refresh()}
    />
  )
}
