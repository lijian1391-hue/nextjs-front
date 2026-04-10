import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    MEDUSA_BACKEND_URL: process.env.MEDUSA_BACKEND_URL || "UNDEFINED",
    NEXT_PUBLIC_DEFAULT_REGION: process.env.NEXT_PUBLIC_DEFAULT_REGION || "UNDEFINED",
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET ? "SET" : "UNDEFINED",
    NODE_ENV: process.env.NODE_ENV,
  })
}
