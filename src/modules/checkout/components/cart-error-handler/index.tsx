"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type CartError = {
  message: string
  variantId: string
  quantity: number
  countryCode: string
}

export default function CartErrorHandler({
  countryCode,
  onRetrySuccess,
}: {
  countryCode: string
  onRetrySuccess: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<CartError | null>(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("quickOrderError")
    if (stored) {
      try {
        setError(JSON.parse(stored))
        sessionStorage.removeItem("quickOrderError")
      } catch {
        sessionStorage.removeItem("quickOrderError")
      }
    }
  }, [])

  const handleRetry = async () => {
    if (!error) return

    setRetrying(true)
    try {
      const { quickOrder } = await import("@lib/data/cart")
      await quickOrder({
        variantId: error.variantId,
        quantity: error.quantity,
        countryCode: error.countryCode,
      })
      sessionStorage.removeItem("quickOrderError")
      onRetrySuccess()
      router.refresh()
    } catch (e) {
      console.error("[retry] Error:", e)
      setError((prev) =>
        prev
          ? {
              ...prev,
              message: e instanceof Error ? e.message : "Failed to add item to cart",
            }
          : null
      )
    } finally {
      setRetrying(false)
    }
  }

  const handleGoBack = () => {
    sessionStorage.removeItem("quickOrderError")
    router.push(`/${countryCode}`)
  }

  if (!error) return null

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 small:py-12">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#dc2626"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          Failed to add item to cart
        </h2>
        <p className="text-sm text-red-600 mb-6">{error.message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="px-6 py-2 bg-jumia-orange text-white rounded-md font-medium hover:bg-jumia-orange-hover transition-colors disabled:opacity-50"
          >
            {retrying ? "Retrying..." : "Try Again"}
          </button>
          <button
            onClick={handleGoBack}
            className="px-6 py-2 border border-gray-300 rounded-md font-medium hover:bg-gray-50 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
