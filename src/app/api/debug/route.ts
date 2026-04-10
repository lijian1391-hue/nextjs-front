import { NextResponse } from "next/server"

export async function GET() {
  const backendUrl = process.env.MEDUSA_BACKEND_URL || ""

  // Test: get regions via raw fetch
  let regionsResult: any = "NOT_TESTED"
  try {
    const res = await fetch(`${backendUrl}/store/regions`, {
      headers: {
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
    })
    const json = await res.json()
    const regionIds = json.regions?.map((r: any) => `${r.id} (${r.countries?.map((c: any) => c.iso_2).join(",")})`)
    regionsResult = regionIds || "NO REGIONS"
  } catch (e: any) {
    regionsResult = `ERROR: ${e.message}`
  }

  return NextResponse.json({
    MEDUSA_BACKEND_URL: backendUrl,
    regions: regionsResult,
  })
}
