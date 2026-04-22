"use client"

import { setAddresses } from "@lib/data/cart"
import { paymentInfoMap } from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@medusajs/ui"
import CartTotals from "@modules/common/components/cart-totals"
import ErrorMessage from "@modules/checkout/components/error-message"
import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import ShippingAddress from "@modules/checkout/components/shipping-address"
import { useActionState, useEffect, useState } from "react"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { useRouter } from "next/navigation"

type OnePageCheckoutProps = {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
  availablePaymentMethods: any[] | null
}

export default function OnePageCheckout({
  cart,
  customer,
  availableShippingMethods,
  availablePaymentMethods,
}: OnePageCheckoutProps) {
  const [message, formAction] = useActionState(setAddresses, null)
  const [initError, setInitError] = useState<string | null>(null)
  const router = useRouter()

  const activePaymentSession = cart.payment_collection?.payment_sessions?.find(
    (s: any) => s.status === "pending"
  )
  const paymentTitle = activePaymentSession
    ? paymentInfoMap[activePaymentSession.provider_id]?.title || activePaymentSession.provider_id
    : availablePaymentMethods?.length
    ? paymentInfoMap[availablePaymentMethods[0].id]?.title || availablePaymentMethods[0].id
    : "Not available"

  useEffect(() => {
    const needsShipping = availableShippingMethods?.length && !(cart.shipping_methods?.length ?? 0)
    const needsPayment = !activePaymentSession && availablePaymentMethods?.length

    if (!needsShipping && !needsPayment) return

    const firstMethod = availableShippingMethods?.find(
      (sm: any) => sm.service_zone?.fulfillment_set?.type !== "pickup"
    ) || availableShippingMethods?.[0]

    fetch("/api/init-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartId: cart.id,
        shippingMethodId: needsShipping ? firstMethod?.id : undefined,
        paymentProviderId: needsPayment ? availablePaymentMethods?.[0].id : undefined,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) {
          setInitError(data.error || "Failed to initialize checkout")
        }
      })
      .catch((e) => setInitError(e.message || "Network error"))
  }, [])

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 small:py-12">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-x-1 text-small-regular text-ui-fg-subtle hover:text-ui-fg-base mb-6 transition-colors"
      >
        ← Back
      </button>

      {/* Init error banner */}
      {initError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm text-red-700 mb-4">Something went wrong. Please go back and try again.</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-jumia-orange text-white rounded-md text-sm font-medium hover:bg-jumia-orange-hover transition-colors"
          >
            Go Back to Product
          </button>
        </div>
      )}

      {!initError && (
        <>

      {/* 1. Order items */}
      <div>
        <Heading level="h2" className="text-2xl-regular mb-4">
          Order Summary
        </Heading>
        <ItemsPreviewTemplate cart={cart} />
      </div>

      {/* 2. Notice */}
      <div className="bg-ui-bg-subtle rounded-rounded p-4 my-6">
        <Text className="text-small-regular text-ui-fg-base">
          <span className="font-semibold">Notice:</span>
          <br />
          1. Fill in your name, phone number, delivery address.
          <br />
          (Items marked with * are required.)
          <br />
          2. Choose payment
          <br />
          3. Click the Confirm button
        </Text>
      </div>

      {/* 3. Address form */}
      <form action={formAction}>
        <input type="hidden" name="same_as_billing" value="on" />

        <Heading level="h2" className="text-2xl-regular mb-4">
          Delivery Address
        </Heading>

        <ShippingAddress
          customer={customer}
          cart={cart}
          checked={true}
          onChange={() => {}}
        />

        {/* 4. Order totals + payment method */}
        <div className="mt-6">
          <Heading level="h3" className="text-xl-regular mb-4">
            Order Total
          </Heading>
          <CartTotals totals={cart} />
          <div className="flex items-center justify-between mt-4 txt-medium text-ui-fg-subtle">
            <span>Payment Method</span>
            <span className="text-ui-fg-base" data-testid="payment-method-display">
              {paymentTitle}
            </span>
          </div>
        </div>

        {/* 5. Confirm button */}
        <div className="pb-8 mt-6">
          <SubmitButton
            className="w-full h-12 text-base-regular"
            data-testid="confirm-order-button"
          >
            Confirm Order
          </SubmitButton>
          <ErrorMessage
            error={message}
            data-testid="checkout-error-message"
          />
          <div className="flex items-center justify-center gap-4 mt-3 text-small-regular text-ui-fg-muted">
            <span>Pay on Delivery</span>
            <span className="text-ui-border-base">|</span>
            <span>Secure Payment</span>
          </div>
        </div>
      </>
      )}
      </form>
    </div>
  )
}
