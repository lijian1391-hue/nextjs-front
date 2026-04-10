import { NextResponse } from "next/server"

export async function GET() {
  const backendUrl = process.env.MEDUSA_BACKEND_URL || "UNDEFINED"

  let backendStatus = "NOT_TESTED"
  try {
    const res = await fetch(`${backendUrl}/store/regions`, {
      headers: {
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
    })
    backendStatus = `${res.status} ${res.statusText}`
  } catch (e: any) {
    backendStatus = `ERROR: ${e.message}`
  }

  return NextResponse.json({
    MEDUSA_BACKEND_URL: backendUrl,
    NEXT_PUBLIC_DEFAULT_REGION: process.env.NEXT_PUBLIC_DEFAULT_REGION || "UNDEFINED",
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET ? "SET" : "UNDEFINED",
    BACKEND_REACHABLE: backendStatus,
  })
}
