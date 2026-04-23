import { NextResponse } from "next/server"
import { getCartId } from "@lib/data/cookies"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"

export async function GET() {
  const cartId = await getCartId()

  if (!cartId) {
    return NextResponse.json({ hasCart: false })
  }

  try {
    const headers = await getAuthHeaders()
    const response = await fetch(
      `${process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"}/store/carts/${cartId}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    )

    if (!response.ok) {
      return NextResponse.json({ hasCart: false })
    }

    const data = await response.json()
    return NextResponse.json({ hasCart: !!data.cart })
  } catch {
    return NextResponse.json({ hasCart: false })
  }
}