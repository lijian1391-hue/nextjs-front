import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"
import { fetchPixelConfigServer, type PixelIds } from "@lib/util/pixel"

type Props = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  /** The initial variant ID from URL searchParams.v_id */
  initialVariantId?: string
}

export default async function ProductActionsWrapper({
  product,
  region,
  initialVariantId,
}: Props) {
  if (!product) {
    return null
  }

  let pixelIds: PixelIds | undefined
  try {
    pixelIds = await fetchPixelConfigServer()
  } catch {
    // Pixel tracking is optional — continue without it
  }

  return (
    <ProductActions
      product={product}
      region={region}
      initialVariantId={initialVariantId}
      pixelIds={pixelIds}
    />
  )
}
