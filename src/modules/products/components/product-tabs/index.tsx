"use client"

import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const rows = [
    { label: "Material", value: product.material },
    { label: "Country of Origin", value: product.origin_country },
    { label: "Type", value: product.type?.value },
    { label: "Weight", value: product.weight ? `${product.weight} g` : null },
    {
      label: "Dimensions",
      value:
        product.length && product.width && product.height
          ? `${product.length}L × ${product.width}W × ${product.height}H`
          : null,
    },
  ].filter((row) => row.value)

  if (rows.length === 0) return null

  return (
    <div className="w-full">
      <h3 className="text-base-semi text-ui-fg-base mb-3">Specifications</h3>
      <div className="border border-ui-border-base rounded-md overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex text-small-regular ${
              i > 0 ? "border-t border-ui-border-base" : ""
            }`}
          >
            <div className="w-1/3 bg-ui-bg-subtle px-4 py-2.5 font-medium text-ui-fg-base">
              {row.label}
            </div>
            <div className="w-2/3 px-4 py-2.5 text-ui-fg-subtle">
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProductTabs
