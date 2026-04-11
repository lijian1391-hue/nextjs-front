import { clx } from "@medusajs/ui"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

function PriceDisplay({
  parts,
  className,
  "data-testid": testId,
  "data-value": dataValue,
}: {
  parts: { value: string; symbol: string }
  className?: string
  "data-testid"?: string
  "data-value"?: number
}) {
  return (
    <span className={className} data-testid={testId} data-value={dataValue}>
      {parts.value}
      <span className="text-[0.65em] ml-0.5">{parts.symbol}</span>
    </span>
  )
}

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
        <PriceDisplay
          parts={selectedPrice.calculated_price_parts}
          className={clx("text-2xl-semi", {
            "text-jumia-orange": selectedPrice.price_type === "sale",
          })}
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        />
        {selectedPrice.price_type === "sale" && (
          <PriceDisplay
            parts={selectedPrice.original_price_parts}
            className="line-through text-base-regular text-ui-fg-muted"
            data-testid="original-product-price"
            data-value={selectedPrice.original_price_number}
          />
        )}
      </div>
    </div>
  )
}
