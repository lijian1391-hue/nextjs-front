import { NextRequest, NextResponse } from "next/server"
import { setShippingMethod, initiatePaymentSession, retrieveCart } from "@lib/data/cart"
import { listCartPaymentMethods } from "@lib/data/payment"

export async function POST(req: NextRequest) {
  try {
    const { cartId, shippingMethodId, paymentProviderId } = await req.json()

    const tasks: Promise<any>[] = []

    if (shippingMethodId) {
      tasks.push(
        setShippingMethod({ cartId, shippingMethodId }).catch((e: any) =>
          console.error("[init-checkout] setShippingMethod:", e.message)
        )
      )
    }

    if (paymentProviderId) {
      tasks.push(
        (async () => {
          const cart = await retrieveCart(cartId)
          if (cart) {
            await initiatePaymentSession(cart, {
              provider_id: paymentProviderId,
            } as any)
          }
        })().catch((e: any) =>
          console.error("[init-checkout] initiatePaymentSession:", e.message)
        )
      )
    }

    await Promise.all(tasks)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
