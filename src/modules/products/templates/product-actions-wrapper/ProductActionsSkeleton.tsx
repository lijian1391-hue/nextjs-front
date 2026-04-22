"use client"

export default function ProductActionsSkeleton() {
  return (
    <div className="flex flex-col gap-y-4 animate-pulse">
      {/* Price placeholder */}
      <div className="h-10 w-32 bg-ui-bg-subtle rounded-rounded" />
      {/* Variant options placeholder */}
      <div className="h-4 w-full bg-ui-bg-subtle rounded-rounded" />
      <div className="h-4 w-3/4 bg-ui-bg-subtle rounded-rounded" />
      {/* Quantity placeholder */}
      <div className="h-10 w-24 bg-ui-bg-subtle rounded-rounded" />
      {/* CTA button placeholder */}
      <div className="h-14 w-full bg-ui-bg-subtle rounded-rounded" />
    </div>
  )
}