import { Heading } from "@medusajs/ui"
import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import PurchaseTracking from "@modules/order/components/purchase-tracking"
import { HttpTypes } from "@medusajs/types"
import { fetchPixelConfigServer } from "@lib/util/pixel"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  let pixelIds
  try {
    pixelIds = await fetchPixelConfigServer()
  } catch {}

  return (
    <div className="py-6 min-h-[calc(100vh-64px)]">
      <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl h-full w-full">
        <PurchaseTracking order={order} pixelIds={pixelIds} />
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex flex-col gap-4 max-w-4xl h-full bg-white w-full py-10"
          data-testid="order-complete-container"
        >
          <Heading
            level="h1"
            className="flex flex-col gap-y-3 text-ui-fg-base text-3xl mb-4"
          >
            <span>Thank you!</span>
            <span>Your order was placed successfully.</span>
          </Heading>
          <OrderDetails order={order} />
          <Heading level="h2" className="flex flex-row text-3xl-regular">
            Summary
          </Heading>
          <Items order={order} />
          <CartTotals totals={order} />
          <ShippingDetails order={order} />
          <PaymentDetails order={order} />
          {process.env.NEXT_PUBLIC_WHATSAPP_NUMBER && (
            <WhatsAppContact order={order} />
          )}
          <Help />
        </div>
      </div>
    </div>
  )
}

function WhatsAppContact({ order }: { order: HttpTypes.StoreOrder }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
  const countryCode = (order.shipping_address as any)?.country_code || "us"
  const items = (order.items ?? []).map((i) => i.product_title).filter(Boolean)
  const itemSummary = items.length > 3
    ? items.slice(0, 3).join(", ") + ` and ${items.length - 3} more`
    : items.join(", ")
  const total = order.total ? (order.total / 100).toFixed(2) : ""
  const currency = order.currency_code?.toUpperCase() || ""

  const message = [
    `Hi, I have a question about my order.`,
    ``,
    `Order: #${order.display_id || order.id}`,
    `Items: ${itemSummary || "N/A"}`,
    `Total: ${currency} ${total}`,
    ``,
    `Link: ${baseUrl}/${countryCode}/order/${order.id}/confirmed`,
  ].join("\n")

  const waUrl = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`

  return (
    <div className="flex items-center gap-x-3 mt-4 p-4 bg-ui-bg-subtle rounded-lg">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16.004c0 3.5 1.132 6.744 3.052 9.378L1.054 31.29l6.118-1.962A15.9 15.9 0 0016.004 32C24.826 32 32 24.826 32 16.004S24.826 0 16.004 0zm9.31 22.598c-.39 1.1-1.932 2.014-3.17 2.282-.846.18-1.95.324-5.67-1.218-4.762-1.97-7.826-6.81-8.064-7.126-.23-.316-1.928-2.568-1.928-4.896s1.218-3.474 1.648-3.948c.39-.432.918-.594 1.218-.594.15 0 .284.008.406.014.43.018.646.044.93.72.354.852 1.218 2.99 1.322 3.21.108.216.216.504.072.798-.136.302-.256.436-.472.688-.216.252-.424.444-.64.716-.2.236-.424.488-.174.924.25.436 1.11 1.828 2.384 2.96 1.64 1.458 3.022 1.91 3.474 2.134.354.174.774.15 1.04-.114.336-.332.75-.884 1.172-1.43.3-.39.68-.44 1.078-.302.406.136 2.568 1.21 3.01 1.43.442.216.734.324.842.504.108.18.108 1.032-.282 2.132z" fill="#25D366"/>
      </svg>
      <div>
        <p className="text-sm font-medium text-ui-fg-base">Need help with your order?</p>
        <p className="text-sm text-ui-fg-muted">
          Contact us on{" "}
          <a
            href={waUrl}
            className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </p>
      </div>
    </div>
  )
}
