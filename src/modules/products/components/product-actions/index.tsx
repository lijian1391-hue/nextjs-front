"use client"

import { quickOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import isEqual from "lodash/isEqual"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileCtaBar from "../mobile-cta-bar"
import { useRouter } from "next/navigation"
import { rudderAnalytics } from "@lib/util/rudderstack"
import { trackPixel } from "@lib/util/pixel"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  /** Initial variant ID from URL searchParams.v_id, passed from server to avoid extra render */
  initialVariantId?: string
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
  initialVariantId,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const countryCode = useParams().countryCode as string
  const viewedRef = useRef(false)

  // Initialize options from initialVariantId; fall back to first variant if no v_id in URL
  const getInitialOptions = (): Record<string, string | undefined> => {
    if (initialVariantId && product.variants?.length) {
      const variant = product.variants.find((v) => v.id === initialVariantId)
      if (variant) return optionsAsKeymap(variant.options)
    }
    // No v_id in URL: auto-select first variant so initial render matches final state
    if (product.variants?.length) {
      return optionsAsKeymap(product.variants[0].options)
    }
    return {}
  }

  const [options, setOptions] = useState<Record<string, string | undefined>>(
    getInitialOptions
  )
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  // User-initiated option changes (not initialization)
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // Track ViewContent once when variant is first selected
  useEffect(() => {
    if (viewedRef.current || !selectedVariant) return
    viewedRef.current = true

    const price = (selectedVariant as any)?.calculated_price?.calculated_amount
    const currencyCode = (selectedVariant as any)?.calculated_price?.currency_code

    const eventId = `${selectedVariant.id}_ViewContent_${Date.now()}`

    rudderAnalytics.track("Product Viewed", {
      product_id: product.id,
      sku: selectedVariant.sku,
      name: product.title,
      price: price ? price / 100 : undefined,
      currency: currencyCode,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      image_url: product.thumbnail,
    })

    trackPixel("ViewContent", {
      content_ids: [product.id],
      content_type: "product",
      value: price ? price / 100 : undefined,
      currency: currencyCode,
    }, eventId)
  }, [selectedVariant, product.id, product.title, product.thumbnail])

  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  const inStock = useMemo(() => {
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }
    if (selectedVariant?.allow_backorder) {
      return true
    }
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }
    return false
  }, [selectedVariant])

  const handleAddToCart = useCallback(async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    try {
      const price = (selectedVariant as any)?.calculated_price?.calculated_amount
      const currencyCode = (selectedVariant as any)?.calculated_price?.currency_code

      await quickOrder({
        variantId: selectedVariant.id,
        quantity,
        countryCode,
      })

      // Track AddToCart
      const addEventId = `${selectedVariant.id}_AddToCart_${Date.now()}`

      rudderAnalytics.track("Product Added", {
        product_id: product.id,
        sku: selectedVariant?.sku,
        name: product.title,
        price: price ? price / 100 : undefined,
        currency: currencyCode,
        quantity,
      })

      trackPixel("AddToCart", {
        content_ids: [product.id],
        content_type: "product",
        value: price ? (price / 100) * quantity : undefined,
        currency: currencyCode,
        contents: [{ id: product.id, quantity }],
      }, addEventId)

      // Track InitiateCheckout
      const checkoutEventId = `${selectedVariant.id}_InitiateCheckout_${Date.now()}`

      rudderAnalytics.track("Checkout Started", {
        revenue: price ? (price / 100) * quantity : undefined,
        currency: currencyCode,
        products: [
          {
            product_id: product.id,
            quantity,
            price: price ? price / 100 : undefined,
          },
        ],
      })

      trackPixel("InitiateCheckout", {
        value: price ? (price / 100) * quantity : undefined,
        currency: currencyCode,
        content_ids: [product.id],
        content_type: "product",
        contents: [{ id: product.id, quantity, item_price: price ? price / 100 : undefined }],
        num_items: quantity,
      }, checkoutEventId)

      router.push(`/${countryCode}/checkout`)
    } catch (error) {
      console.error("[quickOrder] Error:", error)
    } finally {
      setIsAdding(false)
    }
  }, [selectedVariant, quantity, countryCode, router, product.id, product.title])

  // Prefetch checkout page on hover so navigation is instant
  const prefetchCheckout = useCallback(() => {
    router.prefetch(`/${countryCode}/checkout`)
  }, [router, countryCode])

  return (
    <>
      <div className="flex flex-col gap-y-5">
        {/* Price */}
        <ProductPrice product={product} variant={selectedVariant} />

        {/* Urgency trust line */}
        <div className="flex items-center gap-x-2 text-sm text-ui-fg-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>Limited Stock &ndash; Buy Now &amp; Pay on Delivery</span>
        </div>

        {/* Variant selection */}
        {(product.variants?.length ?? 0) > 1 && (
          <div className="flex flex-col gap-y-4">
            {(product.options || []).map((option) => {
              return (
                <div key={option.id}>
                  <OptionSelect
                    option={option}
                    current={options[option.id]}
                    updateOption={setOptionValue}
                    title={option.title ?? ""}
                    data-testid="product-options"
                    disabled={!!disabled || isAdding}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* Quantity selector */}
        <div className="flex flex-col gap-y-2">
          <span className="text-sm font-medium text-ui-fg-base">Quantity</span>
          <div className="flex items-center border border-ui-border-base rounded-md w-fit">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center text-ui-fg-base hover:bg-ui-bg-subtle transition-colors rounded-l-md"
              disabled={quantity <= 1}
            >
              −
            </button>
            <span className="w-12 h-10 flex items-center justify-center text-base-regular border-x border-ui-border-base font-medium">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-10 h-10 flex items-center justify-center text-ui-fg-base hover:bg-ui-bg-subtle transition-colors rounded-r-md"
            >
              +
            </button>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleAddToCart}
          onMouseEnter={prefetchCheckout}
          onTouchStart={prefetchCheckout}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||
            isAdding ||
            !isValidVariant
          }
          variant="primary"
          className="w-full h-14 text-base-regular font-semibold hidden small:flex"
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {!selectedVariant && !options
            ? "Select variant"
            : !inStock || !isValidVariant
            ? "Out of stock"
            : "ORDER NOW"}
        </Button>

        {/* Trust signals below CTA */}
        <div className="hidden small:flex items-center justify-center gap-3 text-small-regular text-ui-fg-muted">
          <span>Pay on Delivery</span>
          <span className="text-ui-border-base">|</span>
          <span>Secure Payment</span>
        </div>
      </div>

      <MobileCtaBar
        product={product}
        variant={selectedVariant}
        options={options}
        updateOptions={setOptionValue}
        inStock={inStock}
        handleAddToCart={handleAddToCart}
        isAdding={isAdding}
        optionsDisabled={!!disabled || isAdding}
        quantity={quantity}
        onPrefetchCheckout={prefetchCheckout}
      />
    </>
  )
}
