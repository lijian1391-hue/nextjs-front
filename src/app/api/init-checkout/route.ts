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
        sdk.client.fetch(`/store/carts/${cartId}/shipping-methods`, {
          method: "POST",
          body: { option_id: shippingMethodId },
          headers,
        })
      )
    }

    if (paymentProviderId) {
      tasks.push(
        sdk.client.fetch(`/store/payment/sessions`, {
          method: "POST",
          body: { provider_id: paymentProviderId, cart_id: cartId },
          headers,
        })
      )
    }

    await Promise.all(tasks)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
