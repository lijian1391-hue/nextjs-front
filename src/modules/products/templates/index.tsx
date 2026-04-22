import React, { Suspense } from "react"

import HeroGallery from "@modules/products/components/hero-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductDescription from "@modules/products/components/product-description"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import ProductInfo from "@modules/products/templates/product-info"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"
import Divider from "@modules/common/components/divider"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  return (
    <>
      <div data-testid="product-container">
        <div className="flex flex-col small:flex-row small:items-start small:gap-8 small:max-w-[1440px] small:mx-auto small:px-4">
          {/* Left column / Top: Image gallery */}
          <div className="w-full small:w-[55%] small:sticky small:top-[80px] small:self-start">
            <HeroGallery images={images} />
          </div>

          {/* Right column / Bottom: Product info + actions */}
          <div className="w-full small:w-[45%] small:max-w-[520px] px-4 small:px-0 pt-4 small:pt-0 pb-28 small:pb-8 flex flex-col gap-y-4">
            <ProductOnboardingCta />
            <ProductInfo product={product} />
            <Suspense fallback={<ProductActionsSkeleton />}>
              <ProductActionsWrapper product={product} region={region} />
            </Suspense>
            <Divider />
            <ProductDescription product={product} />
            <ProductTabs product={product} />
          </div>
        </div>

        <div
          className="content-container my-12 small:my-24"
          data-testid="related-products-container"
        >
        </div>
      </div>
    </>
  )
}

export default ProductTemplate
