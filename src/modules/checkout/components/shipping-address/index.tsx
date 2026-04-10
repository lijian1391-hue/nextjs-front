import { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import React, { useEffect, useState } from "react"
import CountrySelect from "../country-select"

// Nigerian states
const NG_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
]

const COUNTRY_STATES: Record<string, string[]> = {
  ng: NG_STATES,
}

const COUNTRY_CODES: Record<string, string> = {
  ng: "+234",
}

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
    email: cart?.email || "",
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
        email: cart?.email || "",
      }))
    }
  }, [cart])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const updated = { ...prev, [name]: value }
      if (name === "shipping_address.country_code") {
        updated["shipping_address.province"] = ""
      }
      return updated
    })
  }

  // Strip country code for display
  const stripCountryCode = (phone: string, code: string): string => {
    if (phone.startsWith(code)) return phone.slice(code.length)
    if (phone.startsWith("0")) return phone.slice(1)
    return phone
  }

  // Validate phone: only digits, 7-15 digits
  const isValidPhone = (value: string): boolean => {
    const digits = value.replace(/\D/g, "")
    return digits.length >= 7 && digits.length <= 15
  }

  const countryCode = formData["shipping_address.country_code"]?.toLowerCase()
  const states = countryCode ? COUNTRY_STATES[countryCode] || [] : []
  const dialCode = COUNTRY_CODES[countryCode] || ""

  // Prepare phone values for display and submission
  const phoneDisplay = dialCode
    ? stripCountryCode(formData["shipping_address.phone"] || "", dialCode)
    : formData["shipping_address.phone"]
  const whatsappDisplay = dialCode
    ? stripCountryCode(formData["shipping_address.company"] || "", dialCode)
    : formData["shipping_address.company"]

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "")
    const full = dialCode ? `${dialCode}${raw}` : raw
    setFormData((prev) => ({ ...prev, [e.target.name]: full }))
  }

  return (
    <div className="flex flex-col gap-y-5">
      {/* Country/Region */}
      <div>
        <label className="text-small-semi text-ui-fg-base mb-1 block">
          Country / Region *
        </label>
        <CountrySelect
          name="shipping_address.country_code"
          autoComplete="country"
          region={cart?.region}
          value={formData["shipping_address.country_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-country-select"
        />
      </div>

      {/* Full Name */}
      <div>
        <label className="text-small-semi text-ui-fg-base mb-1 block">
          Full Name *
        </label>
        <Input
          label="Enter your full name"
          name="shipping_address.first_name"
          autoComplete="name"
          value={formData["shipping_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-full-name-input"
        />
      </div>

      {/* Email */}
      <div>
        <label className="text-small-semi text-ui-fg-base mb-1 block">
          Email *
        </label>
        <Input
          label="Enter your email address"
          name="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
          data-testid="shipping-email-input"
        />
      </div>

      {/* Phone Number with country code */}
      <div>
        <label className="text-small-semi text-ui-fg-base mb-1 block">
          Phone Number *
        </label>
        <div className="flex items-center gap-x-2">
          {dialCode && (
            <div className="flex items-center h-full px-3 py-2.5 bg-ui-bg-subtle border border-ui-border-base rounded-md text-base-regular text-ui-fg-muted whitespace-nowrap">
              {dialCode}
            </div>
          )}
          <div className="flex-1">
            <Input
              label="Enter your phone number"
              name="shipping_address.phone"
              autoComplete="tel"
              value={phoneDisplay}
              onChange={handlePhoneChange}
              required
              data-testid="shipping-phone-input"
            />
          </div>
        </div>
      </div>

      {/* WhatsApp Account with country code */}
      <div>
        <label className="text-small-semi text-ui-fg-base mb-1 block">
          WhatsApp Account
        </label>
        <div className="flex items-center gap-x-2">
          {dialCode && (
            <div className="flex items-center h-full px-3 py-2.5 bg-ui-bg-subtle border border-ui-border-base rounded-md text-base-regular text-ui-fg-muted whitespace-nowrap">
              {dialCode}
            </div>
          )}
          <div className="flex-1">
            <Input
              label="Enter your WhatsApp number"
              name="shipping_address.company"
              value={whatsappDisplay}
              onChange={handlePhoneChange}
              data-testid="shipping-whatsapp-input"
            />
          </div>
        </div>
      </div>

      {/* State / Province */}
      <div>
        <label className="text-small-semi text-ui-fg-base mb-1 block">
          State
        </label>
        {states.length > 0 ? (
          <div className="relative">
            <select
              name="shipping_address.province"
              value={formData["shipping_address.province"]}
              onChange={handleChange}
              data-testid="shipping-state-select"
              className="w-full appearance-none border border-ui-border-base bg-ui-bg-subtle rounded-md px-4 py-3 text-base-regular outline-none hover:bg-ui-bg-field-hover transition-colors"
            >
              <option value="">Select state</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ui-fg-muted">
              ▾
            </span>
          </div>
        ) : (
          <Input
            label="Enter your state / province"
            name="shipping_address.province"
            autoComplete="address-level1"
            value={formData["shipping_address.province"]}
            onChange={handleChange}
            data-testid="shipping-province-input"
          />
        )}
      </div>

      {/* City */}
      <div>
        <label className="text-small-semi text-ui-fg-base mb-1 block">
          City *
        </label>
        <Input
          label="Enter your city"
          name="shipping_address.city"
          autoComplete="address-level2"
          value={formData["shipping_address.city"]}
          onChange={handleChange}
          required
          data-testid="shipping-city-input"
        />
      </div>

      {/* Detailed Address */}
      <div>
        <label className="text-small-semi text-ui-fg-base mb-1 block">
          Detailed Address *
        </label>
        <Input
          label="Enter your detailed address"
          name="shipping_address.address_1"
          autoComplete="address-line1"
          value={formData["shipping_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="shipping-address-input"
        />
      </div>

      {/* Hidden fields */}
      <input type="hidden" name="shipping_address.last_name" value="" />
      <input type="hidden" name="shipping_address.postal_code" value="000000" />
    </div>
  )
}

export default ShippingAddress
