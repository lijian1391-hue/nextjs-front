import Price from "@modules/common/components/price"
import { HttpTypes } from "@medusajs/types"

type OrderSummaryProps = {
  order: HttpTypes.StoreOrder
}

const OrderSummary = ({ order }: OrderSummaryProps) => {
  const cc = order.currency_code

  return (
    <div>
      <h2 className="text-base-semi">Order Summary</h2>
      <div className="text-small-regular text-ui-fg-base my-2">
        <div className="flex items-center justify-between text-base-regular text-ui-fg-base mb-2">
          <span>Subtotal</span>
          <span><Price amount={order.subtotal ?? 0} currency_code={cc} /></span>
        </div>
        <div className="flex flex-col gap-y-1">
          {order.discount_total > 0 && (
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span>- <Price amount={order.discount_total} currency_code={cc} /></span>
            </div>
          )}
          {order.gift_card_total > 0 && (
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span>- <Price amount={order.gift_card_total} currency_code={cc} /></span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <span><Price amount={order.shipping_total ?? 0} currency_code={cc} /></span>
          </div>
          <div className="flex items-center justify-between">
            <span>Taxes</span>
            <span><Price amount={order.tax_total ?? 0} currency_code={cc} /></span>
          </div>
        </div>
        <div className="h-px w-full border-b border-gray-200 border-dashed my-4" />
        <div className="flex items-center justify-between text-base-regular text-ui-fg-base mb-2">
          <span>Total</span>
          <span><Price amount={order.total} currency_code={cc} /></span>
        </div>
      </div>
    </div>
  )
}

export default OrderSummary
