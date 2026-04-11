import { Text, clx } from "@medusajs/ui"
import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  const parts = price.calculated_price_parts as { value: string; symbol: string } | undefined
  const origParts = price.original_price_parts as { value: string; symbol: string } | undefined

  return (
    <>
      {price.price_type === "sale" && (
        <Text
          className="line-through text-ui-fg-muted"
          data-testid="original-price"
        >
          {origParts ? (
            <>{origParts.value}<span className="text-[0.65em] ml-0.5">{origParts.symbol}</span></>
          ) : (
            price.original_price
          )}
        </Text>
      )}
      <Text
        className={clx("text-ui-fg-muted", {
          "text-ui-fg-interactive": price.price_type === "sale",
        })}
        data-testid="price"
      >
        {parts ? (
          <>{parts.value}<span className="text-[0.65em] ml-0.5">{parts.symbol}</span></>
        ) : (
          price.calculated_price
        )}
      </Text>
    </>
  )
}
