import { NextResponse } from "next/server"
import { retrieveCart } from "@lib/data/cart"

export async function GET() {
  const cart = await retrieveCart()
  return NextResponse.json({ hasCart: !!cart })
}
