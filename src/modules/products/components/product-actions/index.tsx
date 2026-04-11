"use client"

import { addToCart, clearCart } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import ProductPrice from "../product-price"
import MobileCtaBar from "../mobile-cta-bar"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
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
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
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

  // check if the selected variant is in stock
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

  // add the selected variant to the cart and redirect to checkout
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    try {
      await clearCart()
      await addToCart({
        variantId: selectedVariant.id,
        quantity,
        countryCode,
      })

      router.push(`/${countryCode}/checkout`)
    } catch (error) {
      console.error("[addToCart] Error:", error)
    } finally {
      setIsAdding(false)
    }
  }

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
      />
    </>
  )
}
