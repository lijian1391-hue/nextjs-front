import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import CheckoutContent from "@modules/checkout/components/checkout-content"
import { Metadata } from "next"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"

type Props = {
  params: Promise<{ countryCode: string }>
}

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout({ params }: Props) {
  const { countryCode } = await params
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
