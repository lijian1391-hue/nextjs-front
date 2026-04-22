import { listCartShippingMethods } from "@lib/data/fulfillment"
import { initiatePaymentSession, retrieveCart, setShippingMethod } from "@lib/data/cart"
import { listCartPaymentMethods } from "@lib/data/payment"
import { retrieveCustomer } from "@lib/data/customer"
import OnePageCheckout from "@modules/checkout/templates/one-page-checkout"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const [customer, shippingMethods, paymentMethods] = await Promise.all([
    retrieveCustomer(),
    listCartShippingMethods(cart.id),
    listCartPaymentMethods(cart.region?.id ?? ""),
  ])

  // Pre-initialize cart (shipping + payment) on server
  if (
    shippingMethods?.length &&
    (cart.shipping_methods?.length ?? 0) === 0
  ) {
    const firstMethod = shippingMethods.find(
      (sm: any) => sm.service_zone?.fulfillment_set?.type !== "pickup"
    ) || shippingMethods[0]

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

  if (!activeSession && paymentMethods?.length) {
    await initiatePaymentSession(cart, {
      provider_id: paymentMethods[0].id,
    } as any)
  }

  // Re-fetch cart to get updated shipping_method + payment_session
  const updatedCart = await retrieveCart()

  return (
    <OnePageCheckout
      cart={updatedCart ?? cart}
      customer={customer}
      availableShippingMethods={shippingMethods}
      availablePaymentMethods={paymentMethods}
    />
  )
}
