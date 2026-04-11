"use client"

import { HttpTypes } from "@medusajs/types"
import { useMemo, useState } from "react"
import DOMPurify from "isomorphic-dompurify"

type ProductDescriptionProps = {
  product: HttpTypes.StoreProduct
}

const isHtml = (text: string): boolean => {
  return /<[a-zA-Z][^>]*>/.test(text)
}

const ProductDescription = ({ product }: ProductDescriptionProps) => {
  const [expanded, setExpanded] = useState(false)

  const sanitizedHtml = useMemo(() => {
    if (!product.description || !isHtml(product.description)) return ""
    return DOMPurify.sanitize(product.description, {
      ALLOWED_TAGS: [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "br", "hr",
        "strong", "b", "em", "i", "u", "s", "strike",
        "ul", "ol", "li",
        "blockquote",
        "a",
        "img",
        "iframe",
        "div",
        "span",
        "figure", "figcaption",
        "table", "thead", "tbody", "tr", "th", "td",
      ],
      ALLOWED_ATTR: [
        "href", "target", "rel",
        "src", "alt", "title", "width", "height",
        "class", "style",
        "allow", "allowfullscreen", "frameborder",
        "data-youtube-video",
      ],
      ADD_ATTR: ["allow", "allowfullscreen", "frameborder"],
    })
  }, [product.description])

  if (!product.description) return null

  const hasHtml = isHtml(product.description)

  if (hasHtml) {
    return (
      <div className="py-2">
        <h3 className="text-base-semi text-ui-fg-base mb-3">Description</h3>
        <div
          className={`rich-description text-sm-regular text-ui-fg-subtle leading-relaxed ${
            !expanded ? "line-clamp-4 small:line-clamp-none" : ""
          }`}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-jumia-orange text-small-regular mt-2 small:hidden font-medium"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      </div>
    )
  }

  // Fallback: plain text with bullet-point rendering
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
