import { clx } from "@medusajs/ui"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return <div className="block w-32 h-9 bg-gray-100 animate-pulse" />
  }

  return (
    <div className="flex flex-col gap-y-1">
      {/* Discount badge + price row */}
      <div className="flex items-baseline gap-x-3 flex-wrap">
        {selectedPrice.price_type === "sale" && (
          <span className="inline-block bg-jumia-orange text-white text-xs font-bold px-2 py-0.5 rounded">
            -{selectedPrice.percentage_diff}%
          </span>
        )}
        <span
          className={clx("text-2xl-semi", {
            "text-jumia-orange": selectedPrice.price_type === "sale",
          })}
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {!variant && "From "}
          {selectedPrice.calculated_price}
        </span>
        {selectedPrice.price_type === "sale" && (
          <span
            className="line-through text-base-regular text-ui-fg-muted"
            data-testid="original-product-price"
            data-value={selectedPrice.original_price_number}
          >
            {selectedPrice.original_price}
          </span>
        )}
      </div>
    </div>
  )
}
