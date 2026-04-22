import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

type Props = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  /** The initial variant ID from URL searchParams.v_id */
  initialVariantId?: string
}

/**
 * Passes real-time product data to the client-side ProductActions component.
 * The product is fetched once in page.tsx to avoid duplicate API calls.
 */
export default async function ProductActionsWrapper({
  product,
  region,
  initialVariantId,
}: Props) {
  if (!product) {
    return null
  }

  return (
    <ProductActions
      product={product}
      region={region}
      initialVariantId={initialVariantId}
    />
  )
}