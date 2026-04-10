"use client"

import { Button, clx } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"
import { isSimpleProduct } from "@lib/util/product"
import useToggleState from "@lib/hooks/use-toggle-state"
import { useMemo } from "react"
import ProductPrice from "../product-price"
import VariantSelectorSheet from "../product-actions/variant-selector-sheet"

type MobileCtaBarProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (id: string, value: string) => void
  inStock?: boolean
  handleAddToCart: () => void
  isAdding?: boolean
  optionsDisabled: boolean
}

const MobileCtaBar = ({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  isAdding,
  optionsDisabled,
}: MobileCtaBarProps) => {
  const { state: sheetOpen, open: openSheet, close: closeSheet } = useToggleState()
  const isSimple = isSimpleProduct(product)

  const price = getProductPrice({
    product: product,
    variantId: variant?.id,
  })

  const selectedPrice = useMemo(() => {
    if (!price) return null
    const { variantPrice, cheapestPrice } = price
    return variantPrice || cheapestPrice || null
  }, [price])

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-50 small:hidden bg-white border-t border-ui-border-base shadow-elevation-card-rest">
        <div className="flex items-center h-16 gap-x-3 px-4">
          {/* Price + variant summary */}
          <button
            onClick={!isSimple ? openSheet : undefined}
            className="flex-1 text-left min-w-0"
          >
            {!isSimple && (
              <div className="text-small-regular text-ui-fg-muted truncate">
                {variant && Object.keys(options).length > 0
                  ? Object.values(options).join(" / ")
                  : "Select options"}
              </div>
            )}
            {selectedPrice ? (
              <div className="flex items-center gap-x-2">
                {selectedPrice.price_type === "sale" && (
                  <span className="line-through text-small-regular text-ui-fg-muted">
                    {selectedPrice.original_price}
                  </span>
                )}
                <span
                  className={clx("text-base-semi", {
                    "text-ui-fg-interactive":
                      selectedPrice.price_type === "sale",
                  })}
                >
                  {selectedPrice.calculated_price}
                </span>
              </div>
            ) : (
              <ProductPrice product={product} variant={variant} />
            )}
          </button>

          {/* Add to cart button */}
          <Button
            onClick={handleAddToCart}
            disabled={!inStock || !variant || isAdding}
            variant="primary"
            className="h-10 px-6 shrink-0"
            isLoading={isAdding}
            data-testid="mobile-cart-button"
          >
            {!variant
              ? "Select"
              : !inStock
              ? "Sold out"
              : "Add to cart"}
          </Button>
        </div>
      </div>

      {/* Variant selection sheet */}
      {!isSimple && (
        <VariantSelectorSheet
          isOpen={sheetOpen}
          close={closeSheet}
          product={product}
          options={options}
          updateOptions={updateOptions}
          disabled={optionsDisabled}
        />
      )}
    </>
  )
}

export default MobileCtaBar
