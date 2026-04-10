import React, { Suspense } from "react"

import HeroGallery from "@modules/products/components/hero-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductDescription from "@modules/products/components/product-description"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

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
        <div className="flex flex-col small:flex-row small:items-start small:gap-10 small:max-w-[1440px] small:mx-auto small:px-6">
          {/* Left column / Top: Image gallery */}
          <div className="w-full small:w-[55%] small:sticky small:top-[100px] small:self-start">
            <HeroGallery images={images} />
          </div>

          {/* Right column / Bottom: Product info + actions */}
          <div className="w-full small:w-[45%] small:max-w-[500px] px-4 small:px-0 pt-6 small:pt-0 pb-24 small:pb-8 flex flex-col gap-y-6">
            <ProductOnboardingCta />
            <ProductInfo product={product} />
            <Suspense
              fallback={
                <ProductActions
                  disabled={true}
                  product={product}
                  region={region}
                />
              }
            >
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>
            <ProductDescription product={product} />
            <ProductTabs product={product} />
          </div>
        </div>

        <div
          className="content-container my-16 small:my-32"
          data-testid="related-products-container"
        >
          <Suspense fallback={<SkeletonRelatedProducts />}>
            <RelatedProducts product={product} countryCode={countryCode} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

export default ProductTemplate
