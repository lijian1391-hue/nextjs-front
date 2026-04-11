"use client"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

export default function HomeSortSelect({ currentSort }: { currentSort: SortOptions }) {
  const options: { value: SortOptions; label: string }[] = [
    { value: "created_at", label: "Latest" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
  ]

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="home-sort" className="text-small-regular text-ui-fg-muted hidden small:inline">
        Sort:
      </label>
      <select
        id="home-sort"
        name="sortBy"
        defaultValue={currentSort}
        className="text-small-regular border border-ui-border-base rounded-md px-3 py-2 bg-white text-ui-fg-base focus:outline-none focus:ring-1 focus:ring-jumia-orange"
        onChange={(e) => {
          const url = new URL(window.location.href)
          url.searchParams.set("sortBy", e.target.value)
          url.searchParams.delete("page")
          window.location.href = url.toString()
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
