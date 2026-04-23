import { NextRequest, NextResponse } from "next/server"
import {
  setShippingMethod,
  initiatePaymentSession,
  retrieveCart,
} from "@lib/data/cart"
import { getCartId } from "@lib/data/cookies"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    let cartId = body.cartId ?? (await getCartId())

    // Cart not ready yet — polling will retry
    if (!cartId) {
      return NextResponse.json({ ok: false })
    }

    const tasks: Promise<any>[] = []

    if (body.shippingMethodId) {
      tasks.push(
        setShippingMethod({ cartId, shippingMethodId: body.shippingMethodId }).catch(
          (e: any) => console.error("[init-checkout] setShippingMethod:", e.message)
        )
      )
    }

    if (body.paymentProviderId) {
      tasks.push(
        (async () => {
          const cart = await retrieveCart(cartId)
          if (cart) {
            await initiatePaymentSession(cart, {
              provider_id: body.paymentProviderId,
            } as any)
          }
        })().catch((e: any) =>
          console.error("[init-checkout] initiatePaymentSession:", e.message)
        )
      )
    }

    await Promise.all(tasks)

    // Fetch fresh cart so client gets actual cart data, bypassing stale server-render
    const cart = await retrieveCart(cartId)

    return NextResponse.json({ ok: true, cart })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
