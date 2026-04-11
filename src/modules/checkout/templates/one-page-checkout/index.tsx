"use client"

import { initiatePaymentSession, setShippingMethod } from "@lib/data/cart"
import { paymentInfoMap } from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@medusajs/ui"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import ErrorMessage from "@modules/checkout/components/error-message"
import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import ShippingAddress from "@modules/checkout/components/shipping-address"
import { setAddresses } from "@lib/data/cart"
import { useActionState, useEffect, useMemo, useState } from "react"
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
  const router = useRouter()

  // Determine active payment info
  const activePaymentSession = cart.payment_collection?.payment_sessions?.find(
    (s: any) => s.status === "pending"
  )
  const paymentTitle = activePaymentSession
    ? paymentInfoMap[activePaymentSession.provider_id]?.title || activePaymentSession.provider_id
    : availablePaymentMethods?.length
    ? paymentInfoMap[availablePaymentMethods[0].id]?.title || availablePaymentMethods[0].id
    : "Not available"

  // Auto-select shipping method and payment on mount
  useEffect(() => {
    const autoSelect = async () => {
      try {
        if (
          availableShippingMethods?.length &&
          (cart.shipping_methods?.length ?? 0) === 0
        ) {
          const firstMethod = availableShippingMethods.find(
            (sm) => sm.service_zone?.fulfillment_set?.type !== "pickup"
          ) || availableShippingMethods[0]

          if (firstMethod) {
            await setShippingMethod({
              cartId: cart.id,
              shippingMethodId: firstMethod.id,
            })
          }
        }

        const activeSession = cart.payment_collection?.payment_sessions?.find(
          (s: any) => s.status === "pending"
        )

        if (!activeSession && availablePaymentMethods?.length) {
          await initiatePaymentSession(cart, {
            provider_id: availablePaymentMethods[0].id,
          })
        }
      } catch (e: any) {
        console.error("[autoSelect] Error:", e.message)
      }
    }

    autoSelect()
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

      {/* 1. Order items */}
      <div>
        <Heading level="h2" className="text-2xl-regular mb-4">
          Order Summary
        </Heading>
        <ItemsPreviewTemplate cart={cart} />
        <Divider />
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

        <Divider className="my-6" />

        {/* 4. Order totals + payment method */}
        <div>
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

        <Divider className="my-6" />

        {/* 5. Confirm button */}
        <div className="pb-8">
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
      </form>
    </div>
  )
}
