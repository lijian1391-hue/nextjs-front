import { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

export const revalidate = 300

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

const cachedGetRegion = cache(getRegion)
const cachedListProducts = cache(
  async (
    countryCode: string,
    handle: string
  ): Promise<HttpTypes.StoreProduct | undefined> => {
    const { response } = await listProducts({
      countryCode,
      queryParams: { handle },
    })
    return response.products[0]
  }
)

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.flatMap((r) => r.countries?.map((c) => c.iso_2) ?? []) ?? []
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const region = await cachedGetRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await cachedListProducts(params.countryCode, params.handle)

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | Medusa Store`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | Medusa Store`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!product || !selectedVariantId || !product.variants) {
    return product?.images ?? []
  }

  const variant = product.variants.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images ?? []
  }

  const imageIdsMap = new Map(variant.images.map((i) => [i.id, true]))
  return (product.images ?? []).filter((i) => imageIdsMap.has(i.id))
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await cachedGetRegion(params.countryCode)
  const searchParams = await props.searchParams

  if (!region) {
    notFound()
  }

  const pricedProduct = await cachedListProducts(params.countryCode, params.handle)

  if (!pricedProduct) {
    notFound()
  }

  const selectedVariantId = searchParams.v_id
  const images = getImagesForVariant(pricedProduct, selectedVariantId)

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
      images={images}
      initialVariantId={selectedVariantId}
    />
  )
}
