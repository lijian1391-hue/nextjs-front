"use client"

import { HttpTypes } from "@medusajs/types"
import { useState } from "react"

type ProductDescriptionProps = {
  product: HttpTypes.StoreProduct
}

const ProductDescription = ({ product }: ProductDescriptionProps) => {
  const [expanded, setExpanded] = useState(false)

  if (!product.description) return null

  // Split description into lines for bullet-point rendering
  const lines = product.description
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  return (
    <div className="py-2">
      <h3 className="text-base-semi text-ui-fg-base mb-3">Description</h3>
      <div
        className={`text-sm-regular text-ui-fg-subtle leading-relaxed ${
          !expanded ? "line-clamp-4 small:line-clamp-none" : ""
        }`}
      >
        {lines.length > 1 ? (
          <ul className="list-disc list-inside space-y-1">
            {lines.map((line, i) => (
              <li key={i}>{line.replace(/^[-•*]\s*/, "")}</li>
            ))}
          </ul>
        ) : (
          <p>{product.description}</p>
        )}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-jumia-orange text-small-regular mt-2 small:hidden font-medium"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  )
}

export default ProductDescription
