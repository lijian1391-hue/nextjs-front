import { splitPriceParts } from "@lib/util/money"

type PriceProps = {
  amount: number
  currency_code: string
  className?: string
}

export default function Price({ amount, currency_code, className }: PriceProps) {
  const { value, symbol } = splitPriceParts({ amount, currency_code })
  return (
    <span className={className}>
      {value}
      <span className="text-[0.65em] ml-0.5">{symbol}</span>
    </span>
  )
}
