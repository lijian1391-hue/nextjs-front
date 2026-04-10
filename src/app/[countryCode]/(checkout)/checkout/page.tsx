import { listCartShippingMethods } from "@lib/data/fulfillment"
import { retrieveCart } from "@lib/data/cart"
import { listCartPaymentMethods } from "@lib/data/payment"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import OnePageCheckout from "@modules/checkout/templates/one-page-checkout"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()
  const shippingMethods = await listCartShippingMethods(cart.id)
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

  return (
    <PaymentWrapper cart={cart}>
      <OnePageCheckout
        cart={cart}
        customer={customer}
        availableShippingMethods={shippingMethods}
        availablePaymentMethods={paymentMethods}
      />
    </PaymentWrapper>
  )
}
