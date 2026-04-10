"use client"

import { HttpTypes } from "@medusajs/types"
import { useState } from "react"

type ProductDescriptionProps = {
  product: HttpTypes.StoreProduct
}

const ProductDescription = ({ product }: ProductDescriptionProps) => {
  const [expanded, setExpanded] = useState(false)

  if (!product.description) return null

  return (
    <div className="py-4">
      <div
        className={`text-base-regular text-ui-fg-subtle whitespace-pre-line ${
          !expanded ? "line-clamp-3 small:line-clamp-none" : ""
        }`}
      >
        {product.description}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-ui-fg-interactive text-small-regular mt-1 small:hidden"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  )
}

export default ProductDescription
