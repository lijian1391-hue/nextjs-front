import { Metadata } from "next"
import { Suspense } from "react"

import { getRegion } from "@lib/data/regions"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import HomeSortSelect from "./home-sort-select"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

export const metadata: Metadata = {
  title: "Afrylo — Quality Products, Great Prices",
  description:
    "Shop quality products at great prices. Pay on delivery across Nigeria.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ sortBy?: string; page?: string }>
}) {
  const params = await props.params
  const searchParams = await props.searchParams

  const { countryCode } = params
  const sortBy = (searchParams.sortBy as SortOptions) || "created_at"
  const page = searchParams.page ? parseInt(searchParams.page) : 1

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  return (
    <div className="content-container py-6 small:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl-semi small:text-2xl-semi text-ui-fg-base">All Products</h1>
        <HomeSortSelect currentSort={sortBy} />
      </div>
      <Suspense fallback={<SkeletonProductGrid />}>
        <PaginatedProducts
          sortBy={sortBy}
          page={page}
          countryCode={countryCode}
        />
      </Suspense>
    </div>
  )
}
