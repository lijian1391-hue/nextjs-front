const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "Afrylo"

export default function Footer() {
  return (
    <footer className="border-t border-ui-border-base w-full mt-8">
      <div className="content-container py-4">
        <div className="flex flex-col small:flex-row items-center justify-between gap-2 text-small-regular text-ui-fg-muted">
          <span>&copy; {new Date().getFullYear()} {STORE_NAME}</span>
          <div className="flex gap-4">
            <span>Pay on Delivery</span>
            <span className="text-ui-border-base">|</span>
            <span>Secure Payment</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
