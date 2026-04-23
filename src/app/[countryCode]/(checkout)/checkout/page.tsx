import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import CheckoutContent from "@modules/checkout/components/checkout-content"
import { Metadata } from "next"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import {
  getCartId,
  getPendingCartId,
  clearPendingCartId,
  removeCartId,
} from "@lib/data/cookies"

type Props = {
  params: Promise<{ countryCode: string }>
}

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout({ params }: Props) {
  const { countryCode } = await params

  // Check if quickOrder is still in progress
  const pendingCartId = await getPendingCartId()
  const currentCartId = await getCartId()

  // If no cart but has pending, wait for quickOrder to complete
  if (!currentCartId && pendingCartId) {
    // Clear pending flag since we're checking now
    await clearPendingCartId()
    // Return waiting state - checkout-content will poll
    return (
      <CheckoutContent
        countryCode={countryCode}
        hasCart={false}
        pendingCartId={pendingCartId}
      />
    )
  }

  const cart = await retrieveCart()

  if (!cart) {
    return <CheckoutContent countryCode={countryCode} hasCart={false} />
  }

  const [customer, shippingMethods, paymentMethods] = await Promise.all([
    retrieveCustomer(),
    listCartShippingMethods(cart.id),
    listCartPaymentMethods(cart.region?.id ?? ""),
  ])

  return (
    <CheckoutContent
      countryCode={countryCode}
      hasCart={true}
      cart={cart}
      customer={customer}
      availableShippingMethods={shippingMethods}
      availablePaymentMethods={paymentMethods}
    />
  )
}
