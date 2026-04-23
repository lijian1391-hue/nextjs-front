import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import OnePageCheckout from "@modules/checkout/templates/one-page-checkout"
import CheckoutContent from "@modules/checkout/components/checkout-content"
import { Metadata } from "next"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ countryCode: string }>
}

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout({ params }: Props) {
  const { countryCode } = await params

  // Always fetch fresh cart data — no cache
  const cart = await retrieveCart()

  if (!cart) {
    return <CheckoutContent countryCode={countryCode} hasCart={false} />
  }

  // Fetch all supporting data in parallel, bypassing cache
  const headers = { ...(await getAuthHeaders()) }

  const [customer, shippingMethods, paymentMethods] = await Promise.all([
    retrieveCustomer(),
    sdk.client
      .fetch<{ shipping_options: HttpTypes.StoreCartShippingOption[] }>(
        `/store/shipping-options`,
        {
          method: "GET",
          query: { cart_id: cart.id },
          headers,
        }
      )
      .then((r) => r.shipping_options)
      .catch(() => null),
    sdk.client
      .fetch<HttpTypes.StorePaymentProviderListResponse>(
        `/store/payment-providers`,
        {
          method: "GET",
          query: { region_id: cart.region?.id ?? "" },
          headers,
        }
      )
      .then((r) => r.payment_providers ?? [])
      .catch(() => null),
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
