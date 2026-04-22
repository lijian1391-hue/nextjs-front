import { NextRequest, NextResponse } from "next/server"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"

export async function POST(req: NextRequest) {
  try {
    const { cartId, shippingMethodId, paymentProviderId } = await req.json()
    const headers = { ...(await getAuthHeaders()) }

    const tasks: Promise<any>[] = []

    if (shippingMethodId) {
      tasks.push(
        sdk.store.cart.addShippingMethod(
          cartId,
          { option_id: shippingMethodId },
          {},
          headers
        )
      )
    }

    if (paymentProviderId) {
      tasks.push(
        sdk.store.payment.initiatePaymentSession(
          { cart_id: cartId } as any,
          { provider_id: paymentProviderId },
          {},
          headers
        )
      )
    }

    await Promise.all(tasks)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
