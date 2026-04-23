"use client"

import { Button, clx } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { isSimpleProduct } from "@lib/util/product"
import useToggleState from "@lib/hooks/use-toggle-state"
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
  quantity?: number
  onPrefetchCheckout?: () => void
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
  onPrefetchCheckout,
}: MobileCtaBarProps) => {
  const { state: sheetOpen, open: openSheet, close: closeSheet } = useToggleState()
  const isSimple = isSimpleProduct(product)

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-50 small:hidden bg-white border-t border-ui-border-base shadow-lg">
        <div className="flex flex-col px-4 pt-2 pb-3">
          {/* Variant summary */}
          {!isSimple && (
            <button
              onClick={openSheet}
              className="text-left mb-2"
            >
              <span className="text-small-regular text-ui-fg-muted truncate">
                {variant && Object.keys(options).length > 0
                  ? Object.values(options).join(" / ")
                  : "Select options"}
              </span>
            </button>
          )}

          {/* CTA button */}
          <Button
            onClick={handleAddToCart}
            onTouchStart={onPrefetchCheckout}
            disabled={!inStock || !variant || isAdding}
            variant="primary"
            className="w-full h-12 font-semibold active:scale-[0.98] transition-transform duration-100"
            isLoading={isAdding}
            data-testid="mobile-cart-button"
          >
            {!variant
              ? "Select options"
              : !inStock
              ? "Sold out"
              : "ORDER NOW"}
          </Button>

          {/* Trust signal */}
          <span className="text-center text-xs text-ui-fg-muted mt-1.5">
            Pay on Delivery &bull; Secure Payment
          </span>
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
