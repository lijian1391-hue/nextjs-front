import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"
import { fetchPixelConfigServer, resolvePlatforms, type PixelIds, type PixelPlatform } from "@lib/util/pixel"

type Props = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
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

  const pixelPlatforms: PixelPlatform[] = pixelIds
    ? resolvePlatforms(product.metadata, pixelIds)
    : []

  return (
    <ProductActions
      product={product}
      region={region}
      initialVariantId={initialVariantId}
      pixelIds={pixelIds}
      pixelPlatforms={pixelPlatforms}
    />
  )
}
