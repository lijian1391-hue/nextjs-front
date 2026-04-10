import { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import React, { useEffect, useMemo, useState } from "react"
import CountrySelect from "../country-select"

const ShippingAddress = ({
  customer,
  cart,
  checked,
  onChange,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  checked: boolean
  onChange: () => void
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code":
      cart?.shipping_address?.country_code ||
      cart?.region?.countries?.[0]?.iso_2 ||
      "",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
  })

  useEffect(() => {
    if (cart?.shipping_address) {
      setFormData((prev) => ({
        ...prev,
        "shipping_address.first_name":
          cart.shipping_address?.first_name || "",
        "shipping_address.last_name": "",
        "shipping_address.address_1":
          cart.shipping_address?.address_1 || "",
        "shipping_address.company":
          cart.shipping_address?.company || "",
        "shipping_address.postal_code":
          cart.shipping_address?.postal_code || "",
        "shipping_address.city": cart.shipping_address?.city || "",
        "shipping_address.country_code":
          cart.shipping_address?.country_code ||
          cart.region?.countries?.[0]?.iso_2 ||
          "",
        "shipping_address.province":
          cart.shipping_address?.province || "",
        "shipping_address.phone":
          cart.shipping_address?.phone || "",
      }))
    }
  }, [cart])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="flex flex-col gap-y-4">
      {/* Country/Region */}
      <CountrySelect
        name="shipping_address.country_code"
        autoComplete="country"
        region={cart?.region}
        value={formData["shipping_address.country_code"]}
        onChange={handleChange}
        required
        data-testid="shipping-country-select"
      />

      {/* Full Name */}
      <Input
        label="Full Name *"
        name="shipping_address.first_name"
        autoComplete="name"
        value={formData["shipping_address.first_name"]}
        onChange={handleChange}
        required
        data-testid="shipping-full-name-input"
      />

      {/* Phone Number */}
      <Input
        label="Phone Number *"
        name="shipping_address.phone"
        autoComplete="tel"
        value={formData["shipping_address.phone"]}
        onChange={handleChange}
        required
        data-testid="shipping-phone-input"
      />

      {/* WhatsApp Account */}
      <Input
        label="WhatsApp Account"
        name="shipping_address.company"
        value={formData["shipping_address.company"]}
        onChange={handleChange}
        data-testid="shipping-whatsapp-input"
      />

      {/* State / Province */}
      <Input
        label="State / Province"
        name="shipping_address.province"
        autoComplete="address-level1"
        value={formData["shipping_address.province"]}
        onChange={handleChange}
        data-testid="shipping-province-input"
      />

      {/* Detailed Address */}
      <Input
        label="Detailed Address *"
        name="shipping_address.address_1"
        autoComplete="address-line1"
        value={formData["shipping_address.address_1"]}
        onChange={handleChange}
        required
        data-testid="shipping-address-input"
      />

      {/* City */}
      <Input
        label="City *"
        name="shipping_address.city"
        autoComplete="address-level2"
        value={formData["shipping_address.city"]}
        onChange={handleChange}
        required
        data-testid="shipping-city-input"
      />

      {/* Hidden fields for required data */}
      <input type="hidden" name="shipping_address.last_name" value="" />
      <input type="hidden" name="shipping_address.postal_code" value="000000" />
    </div>
  )
}

export default ShippingAddress
