import { HttpTypes } from "@medusajs/types"
import { Heading } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  return (
    <div id="product-info">
      <div className="flex flex-col gap-y-2">
        {product.collection && (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="text-small-regular text-ui-fg-muted hover:text-jumia-orange transition-colors"
          >
            {product.collection.title}
          </LocalizedClientLink>
        )}
        <Heading
          level="h1"
          className="text-xl small:text-2xl leading-7 small:leading-8 text-ui-fg-base"
          data-testid="product-title"
        >
          {product.title}
        </Heading>
      </div>
    </div>
  )
}

export default ProductInfo
