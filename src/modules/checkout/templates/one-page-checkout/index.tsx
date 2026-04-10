"use client"

import { initiatePaymentSession, placeOrder, setShippingMethod } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button, Heading, Text } from "@medusajs/ui"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import ErrorMessage from "@modules/checkout/components/error-message"
import DiscountCode from "@modules/checkout/components/discount-code"
import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import ShippingAddress from "@modules/checkout/components/shipping-address"
import { setAddresses } from "@lib/data/cart"
import { useActionState, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { SubmitButton } from "@modules/checkout/components/submit-button"

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
  const router = useRouter()
  const countryCode = useParams().countryCode as string
  const [message, formAction] = useActionState(setAddresses, null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-select shipping method and payment on mount
  useEffect(() => {
    const autoSelect = async () => {
      try {
        // Auto-select first shipping method if none selected
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

        // Auto-select first payment method if none active
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
      {/* 1. Order items */}
      <div>
        <Heading level="h2" className="text-2xl-regular mb-4">
          Order Summary
        </Heading>
        <ItemsPreviewTemplate cart={cart} />
        <div className="my-4">
          <DiscountCode cart={cart} />
        </div>
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
      <form
        action={formAction}
        onSubmit={() => setSubmitting(true)}
      >
        <input type="hidden" name="same_as_billing" value="on" />
        <input type="hidden" name="email" value={`${cart.id}@checkout.placeholder`} />

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

        {/* 4. Order totals */}
        <div>
          <Heading level="h3" className="text-xl-regular mb-4">
            Order Total
          </Heading>
          <CartTotals totals={cart} />
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
            error={message || error}
            data-testid="checkout-error-message"
          />
        </div>
      </form>
    </div>
  )
}
