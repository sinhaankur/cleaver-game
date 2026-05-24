import Link from "next/link"
import { StarCleaverPage } from "./star-cleaver-page"

export default function Page() {
  return (
    <>
      <StarCleaverPage />
      <Link
        href="https://www.sinhaankur.com"
        rel="noopener"
        className="
          fixed top-3 left-3 sm:top-4 sm:left-4 z-40
          inline-flex items-center gap-1.5
          font-mono text-[10px] sm:text-xs uppercase tracking-[0.18em]
          text-white/70 hover:text-white
          bg-black/40 hover:bg-black/60
          px-2.5 py-1.5 rounded
          border border-white/15
          backdrop-blur-sm
          transition-colors
        "
        aria-label="Back to sinhaankur.com"
      >
        ← sinhaankur.com
      </Link>
    </>
  )
}
