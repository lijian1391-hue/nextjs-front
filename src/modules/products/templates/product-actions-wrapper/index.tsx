import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Passes real-time product data to the client-side ProductActions component.
 * The product is fetched once in page.tsx to avoid duplicate API calls.
 */
export default async function ProductActionsWrapper({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}) {
  if (!product) {
    return null
  }

  return <ProductActions product={product} region={region} />
}