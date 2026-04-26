import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  let localeValue: string | null = null
  try {
    const localeHeader = await getLocaleHeader()
    localeValue = localeHeader?.["x-medusa-locale"] ?? null
  } catch {}

  const newHeaders: Record<string, string> = {
    "Cache-Control": "no-cache",
  }
  if (localeValue) {
    newHeaders["x-medusa-locale"] = localeValue
  }
  if (init?.headers && typeof init.headers === "object") {
    Object.assign(newHeaders, init.headers)
  }

  init = {
    ...init,
    headers: newHeaders,
  }
  return originalFetch(input, init)
}
