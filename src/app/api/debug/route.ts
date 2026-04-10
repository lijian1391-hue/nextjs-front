import { NextResponse } from "next/server"

export async function GET() {
  const backendUrl = process.env.MEDUSA_BACKEND_URL || ""
  const pk = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  // Test 1: raw fetch to regions
  let rawFetch = "NOT_TESTED"
  try {
    const res = await fetch(`${backendUrl}/store/regions`, {
      headers: { "x-publishable-api-key": pk },
    })
    rawFetch = `${res.status} ${res.statusText}`
  } catch (e: any) {
    rawFetch = `ERROR: ${e.message}`
  }

  // Test 2: Medusa SDK call
  let sdkTest = "NOT_TESTED"
  try {
    const { sdk } = await import("@lib/config")
    const result = await sdk.store.cart.create(
      { region_id: "test" },
      {},
      { "x-publishable-api-key": pk }
    )
    sdkTest = `OK: ${JSON.stringify(result).slice(0, 100)}`
  } catch (e: any) {
    sdkTest = `ERROR: ${e.message} | stack: ${e.stack?.split("\n").slice(0, 3).join(" | ")}`
  }

  return NextResponse.json({
    MEDUSA_BACKEND_URL: backendUrl,
    rawFetch,
    sdkTest,
  })
}
