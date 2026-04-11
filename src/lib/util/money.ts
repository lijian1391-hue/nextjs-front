import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(amount)
    : amount.toString()
}

/**
 * Returns price split into number and currency symbol parts.
 * Output: { value: "1,500", symbol: "₦" } — number first, symbol second.
 */
export const splitPriceParts = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams): { value: string; symbol: string } => {
  if (!currency_code || isEmpty(currency_code)) {
    return { value: amount.toString(), symbol: "" }
  }

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency_code,
    minimumFractionDigits,
    maximumFractionDigits,
  }).formatToParts(amount)

  const symbol =
    formatted.find((p) => p.type === "currency")?.value || currency_code
  const numberParts = formatted
    .filter((p) => p.type !== "currency")
    .map((p) => p.value)
    .join("")

  return { value: numberParts, symbol }
}
